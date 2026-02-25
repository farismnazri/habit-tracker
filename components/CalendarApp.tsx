'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BackgroundMusicToggle } from '@/components/BackgroundMusicToggle';
import { MissionIcon } from '@/components/MissionIcon';
import { formatDateKeyLocal, parseDateKeyLocal, shiftMonth, WEEKDAY_LABELS } from '@/lib/date';
import { iconSrcForKey } from '@/lib/icon-catalog';
import type { CalendarMonthResponse, DayInspectorResponse, MissionRecord } from '@/types/habit';

type ErrorState = string | null;

type DraftState = {
  checked: Set<string>;
  baseline: Set<string>;
};

type DayCardIconSlot =
  | {
      kind: 'icon';
      mission: MissionRecord;
    }
  | {
      kind: 'overflow';
      hiddenCount: number;
    };

const DAY_CARD_ROW_CAPS = [2, 4, 3] as const;
const DAY_CARD_ICON_SIZE = 'clamp(20px, 1.9vw, 24px)';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? `Request failed (${response.status})`);
  }
  return data as T;
}

function formatMonthKeyFromNow() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatReadableDate(dateKey: string) {
  const date = parseDateKeyLocal(dateKey);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function setsEqual(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

function buildDayCardIconSlots(completed: MissionRecord[]): DayCardIconSlot[] {
  if (completed.length <= 9) {
    return completed.slice(0, 9).map((mission) => ({ kind: 'icon', mission }));
  }

  return [
    ...completed.slice(0, 8).map((mission) => ({ kind: 'icon' as const, mission })),
    { kind: 'overflow', hiddenCount: completed.length - 8 },
  ];
}

function splitDayCardRows(slots: DayCardIconSlot[]) {
  const rows: DayCardIconSlot[][] = [];
  let cursor = 0;

  for (const cap of DAY_CARD_ROW_CAPS) {
    if (cursor >= slots.length) break;
    rows.push(slots.slice(cursor, cursor + cap));
    cursor += cap;
  }

  return rows;
}

function DayCardMissionRows({ dateKey, slots }: { dateKey: string; slots: DayCardIconSlot[] }) {
  const rows = splitDayCardRows(slots);

  if (rows.length === 0) return null;

  const [row1, ...laterRows] = rows;

  function renderSlot(slot: DayCardIconSlot, key: string) {
    if (slot.kind === 'overflow') {
      return (
        <span
          key={key}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-canvas px-1 text-[10px] font-semibold leading-none text-ink"
          style={{
            width: DAY_CARD_ICON_SIZE,
            height: DAY_CARD_ICON_SIZE,
            minWidth: DAY_CARD_ICON_SIZE,
            flex: '0 0 auto',
          }}
          aria-label={`${slot.hiddenCount} more completions`}
          title={`${slot.hiddenCount} more`}
        >
          {slot.hiddenCount}+
        </span>
      );
    }

    return (
      <img
        key={key}
        src={iconSrcForKey(slot.mission.icon_key)}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={['block shrink-0', slot.mission.is_archived ? 'opacity-45' : ''].join(' ').trim()}
        style={{
          width: DAY_CARD_ICON_SIZE,
          height: DAY_CARD_ICON_SIZE,
          minWidth: DAY_CARD_ICON_SIZE,
          flex: '0 0 auto',
        }}
      />
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className={[
          // Row 1 is anchored beside the day badge (right side), centered to the badge vertically.
          'absolute left-[35px] top-5 flex -translate-y-1/2 items-center gap-[3px]',
          'md:left-[41px] md:top-6',
        ].join(' ')}
      >
        {row1.map((slot, slotIndex) => renderSlot(slot, `${dateKey}-row0-${slot.kind}-${slotIndex}`))}
      </div>

      {laterRows.length > 0 ? (
        <div
          className={[
            'absolute inset-x-0 flex flex-col items-center gap-[3px]',
            // Rows 2+ start directly under the badge band.
            'top-[35px]',
            'md:top-[41px]',
          ].join(' ')}
        >
          {laterRows.map((row, rowIndex) => (
            <div key={`${dateKey}-row-${rowIndex + 1}`} className="flex max-w-full items-center justify-center gap-[3px]">
              {row.map((slot, slotIndex) => renderSlot(slot, `${dateKey}-row${rowIndex + 1}-${slot.kind}-${slotIndex}`))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DayChecklistRow({
  mission,
  checked,
  onToggle,
}: {
  mission: MissionRecord;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-canvas px-3 py-2 shadow-sm">
      <input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 accent-active" />
      <MissionIcon mission={mission} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{mission.name}</span>
        <span className="block truncate text-xs text-ink-faint">{mission.icon_key}</span>
      </span>
    </label>
  );
}

export function CalendarApp() {
  const monthSidePaneBackground = '#F2F0EF';
  const [monthKey, setMonthKey] = useState(formatMonthKeyFromNow);
  const [monthData, setMonthData] = useState<CalendarMonthResponse | null>(null);
  const [monthLoading, setMonthLoading] = useState(true);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [inspectorData, setInspectorData] = useState<DayInspectorResponse | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [savingDay, setSavingDay] = useState(false);
  const [error, setError] = useState<ErrorState>(null);
  const monthHeaderMatch = monthData?.monthLabel.match(/^(.*)\s+(\d{4})$/);
  const monthHeaderName = monthHeaderMatch?.[1] ?? (monthData?.monthLabel ?? 'Loading…');
  const monthHeaderYear = monthHeaderMatch?.[2] ?? monthKey.slice(0, 4);
  const calendarWeekRowCount = monthData?.weeks.length ?? 6;

  useEffect(() => {
    if (!window.matchMedia('(min-width: 768px)').matches) return;

    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
      htmlHeight: html.style.height,
      bodyHeight: body.style.height,
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';
    html.style.height = '100%';
    body.style.height = '100%';

    return () => {
      html.style.overflow = previous.htmlOverflow;
      body.style.overflow = previous.bodyOverflow;
      html.style.overscrollBehavior = previous.htmlOverscroll;
      body.style.overscrollBehavior = previous.bodyOverscroll;
      html.style.height = previous.htmlHeight;
      body.style.height = previous.bodyHeight;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMonth() {
      setMonthLoading(true);
      setError(null);
      try {
        const data = await fetchJson<CalendarMonthResponse>(`/api/calendar?month=${monthKey}`);
        if (cancelled) return;
        setMonthData(data);
        setSelectedDateKey((current) => {
          if (current && current.startsWith(`${monthKey}-`)) return current;
          return data.selectedDefaultDateKey;
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load month');
      } finally {
        if (!cancelled) setMonthLoading(false);
      }
    }

    loadMonth();
    return () => {
      cancelled = true;
    };
  }, [monthKey]);

  useEffect(() => {
    if (!selectedDateKey) {
      setInspectorData(null);
      setDraft(null);
      return;
    }

    let cancelled = false;
    async function loadInspector() {
      setError(null);
      try {
        const data = await fetchJson<DayInspectorResponse>(`/api/days/${selectedDateKey}`);
        if (cancelled) return;
        setInspectorData(data);
        const checkedSet = new Set(data.checkedActiveMissionIds);
        setDraft({ checked: checkedSet, baseline: new Set(checkedSet) });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load day');
      }
    }

    loadInspector();
    return () => {
      cancelled = true;
    };
  }, [selectedDateKey]);

  const isDirty = draft ? !setsEqual(draft.checked, draft.baseline) : false;

  async function reloadMonth() {
    const data = await fetchJson<CalendarMonthResponse>(`/api/calendar?month=${monthKey}`);
    setMonthData(data);
  }

  async function saveDay() {
    if (!selectedDateKey || !draft || !isDirty) return;
    setSavingDay(true);
    setError(null);
    try {
      const checkedMissionIds = Array.from(draft.checked);
      const data = await fetchJson<DayInspectorResponse>(`/api/days/${selectedDateKey}`, {
        method: 'PUT',
        body: JSON.stringify({ checkedMissionIds }),
      });
      setInspectorData(data);
      const checkedSet = new Set(data.checkedActiveMissionIds);
      setDraft({ checked: checkedSet, baseline: new Set(checkedSet) });
      await reloadMonth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingDay(false);
    }
  }

  function cancelDayEdits() {
    if (!draft) return;
    setDraft({ checked: new Set(draft.baseline), baseline: new Set(draft.baseline) });
  }

  function toggleMission(missionId: string) {
    setDraft((current) => {
      if (!current) return current;
      const nextChecked = new Set(current.checked);
      if (nextChecked.has(missionId)) nextChecked.delete(missionId);
      else nextChecked.add(missionId);
      return { ...current, checked: nextChecked };
    });
  }

  return (
    <main className="calendar-viewport-shell p-3 md:p-4">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1600px] grid-cols-1 gap-3 md:h-full md:min-h-0 md:overflow-hidden md:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface p-3 shadow-soft md:p-4">
          <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ink-soft">{monthHeaderYear}</p>
              <h1 className="font-shardee text-3xl leading-none text-ink md:text-7xl">{monthHeaderName}</h1>
            </div>
            <div className="flex min-w-[260px] flex-col items-end gap-2">
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm font-medium text-ink hover:bg-surface-muted"
                  onClick={() => setMonthKey(shiftMonth(monthKey, -1))}
                >
                  Prev month
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm font-medium text-ink hover:bg-surface-muted"
                  onClick={() => setMonthKey(formatMonthKeyFromNow())}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm font-medium text-ink hover:bg-surface-muted"
                  onClick={() => setMonthKey(shiftMonth(monthKey, 1))}
                >
                  Next month
                </button>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Link
                  href="/dashboard"
                  className="rounded-xl border border-line bg-canvas px-3 py-2 text-sm font-semibold text-ink hover:bg-surface-muted"
                >
                  Dashboard
                </Link>
                <Link
                  href="/missions"
                  className="rounded-xl border border-active bg-active-soft px-3 py-2 text-sm font-semibold text-ink hover:bg-active"
                >
                  Missions
                </Link>
                <BackgroundMusicToggle />
              </div>
              {monthLoading ? <span className="text-sm text-ink-soft">Loading month…</span> : null}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="grid shrink-0 grid-cols-7 gap-2">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="px-2 py-1 text-center text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                  {label}
                </div>
              ))}
            </div>

            <div
              className="mt-2 grid min-h-0 flex-1 grid-cols-7 gap-2"
              style={{ gridTemplateRows: `repeat(${calendarWeekRowCount}, minmax(0, 1fr))` }}
            >
              {monthData?.weeks.flatMap((week, weekIndex) =>
                week.map((cell, dayIndex) => {
                  if (!cell.dateKey) {
                    return (
                      <div
                        key={`blank-${weekIndex}-${dayIndex}`}
                        className="h-full min-h-0 rounded-xl border border-dashed border-line bg-canvas opacity-25"
                        aria-hidden="true"
                      />
                    );
                  }

                  const selected = selectedDateKey === cell.dateKey;
                  const dayCardSlots = buildDayCardIconSlots(cell.completed);
                  const isToday = cell.isToday;
                  const cardClass = isToday
                    ? selected
                      ? 'border-ink bg-ink ring-2 ring-focus-ring'
                      : 'cursor-pointer border-ink bg-ink'
                    : selected
                      ? 'border-line bg-surface-muted ring-2 ring-focus-ring'
                      : 'cursor-pointer border-line bg-canvas hover:bg-active';
                  const dayCircleClass = isToday ? 'bg-white text-ink' : 'bg-ink text-white';

                  return (
                    <button
                      type="button"
                      key={cell.dateKey}
                      onClick={() => setSelectedDateKey(cell.dateKey)}
                      className={[
                        'relative h-full min-h-0 overflow-hidden rounded-xl border p-2 text-left shadow-sm transition md:p-2.5',
                        cardClass,
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'absolute left-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold md:left-2.5 md:top-2.5 md:h-7 md:w-7 md:text-sm',
                          dayCircleClass,
                        ].join(' ')}
                      >
                        {cell.dayNumber}
                      </span>

                      {dayCardSlots.length > 0 ? <DayCardMissionRows dateKey={cell.dateKey} slots={dayCardSlots} /> : null}
                    </button>
                  );
                }),
              )}
            </div>
          </div>
        </section>

        <aside
          className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-line p-3 shadow-soft md:p-4"
          style={{ backgroundColor: monthSidePaneBackground }}
        >
          <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Day inspector</p>
              <h2 className="text-lg font-semibold text-ink">
                {selectedDateKey ? formatReadableDate(selectedDateKey) : 'Select a day'}
              </h2>
            </div>
          </div>

          <div className="touch-scroll-y min-h-0 flex-1 pr-1">
            {error ? (
              <div className="mb-3 rounded-lg border border-active bg-active-soft px-3 py-2 text-sm text-ink">{error}</div>
            ) : null}

            {!inspectorData || !draft ? (
              <div className="rounded-xl border border-dashed border-line bg-canvas p-4 text-sm text-ink-soft">
                Select a day to edit active missions and review archived completions.
              </div>
            ) : (
              <div className="flex min-h-full flex-col">
                <div className="space-y-2">
                  {inspectorData.activeMissions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-line bg-canvas p-4 text-sm text-ink-soft">
                      No active missions yet. Add them in the Missions screen.
                    </div>
                  ) : (
                    inspectorData.activeMissions.map((mission) => (
                      <DayChecklistRow
                        key={mission.id}
                        mission={mission}
                        checked={draft.checked.has(mission.id)}
                        onToggle={() => toggleMission(mission.id)}
                      />
                    ))
                  )}
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-ink">Archived (read-only)</h3>
                    <span className="text-xs text-ink-soft">Only completed on this day</span>
                  </div>
                  <div className="space-y-2">
                    {inspectorData.archivedCompletedMissions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-line bg-canvas p-3 text-sm text-ink-soft">
                        No archived completions on this date.
                      </div>
                    ) : (
                      inspectorData.archivedCompletedMissions.map((mission) => (
                        <div
                          key={mission.id}
                          className="flex items-center gap-3 rounded-xl border border-line bg-surface-muted px-3 py-2 opacity-75"
                        >
                          <MissionIcon mission={mission} size="md" muted />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">{mission.name}</p>
                            <p className="truncate text-xs text-ink-faint">{mission.icon_key}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-4">
                  <div className="flex gap-2 border-t border-line pt-3">
                    <button
                      type="button"
                      onClick={saveDay}
                      disabled={!isDirty || savingDay}
                      className="flex-1 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-canvas disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingDay ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelDayEdits}
                      disabled={!isDirty || savingDay}
                      className="flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
