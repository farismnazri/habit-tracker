'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MissionIcon } from '@/components/MissionIcon';
import { formatDateKeyLocal, parseDateKeyLocal, shiftMonth, todayDateKeyLocal, WEEKDAY_LABELS } from '@/lib/date';
import type { CalendarMonthResponse, DayInspectorResponse, MissionRecord } from '@/types/habit';

type ErrorState = string | null;

type DraftState = {
  checked: Set<string>;
  baseline: Set<string>;
};

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
    <main className="min-h-screen p-3 md:p-4">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1600px] grid-cols-1 gap-3 md:min-h-[calc(100vh-2rem)] md:grid-cols-[220px_minmax(0,1fr)_340px]">
        <aside
          className="rounded-2xl border border-line p-3 shadow-soft md:p-4"
          style={{ backgroundColor: monthSidePaneBackground }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="font-shardee text-4xl font-semibold text-ink">Habit Tracker</h1>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-line bg-canvas p-2">
            <button
              type="button"
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted"
              onClick={() => setMonthKey(shiftMonth(monthKey, -1))}
            >
              Previous month
            </button>
            <button
              type="button"
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted"
              onClick={() => setMonthKey(formatMonthKeyFromNow())}
            >
              Today ({todayDateKeyLocal()})
            </button>
            <button
              type="button"
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted"
              onClick={() => setMonthKey(shiftMonth(monthKey, 1))}
            >
              Next month
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <Link
              href="/missions"
              className="block rounded-xl border border-active bg-active-soft px-3 py-2 text-sm font-semibold text-ink hover:bg-active"
            >
              Missions
            </Link>
          </div>
        </aside>

        <section className="rounded-2xl border border-line bg-surface p-3 shadow-soft md:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ink-soft">{monthHeaderYear}</p>
              <h1 className="font-shardee text-3xl leading-none text-ink md:text-7xl">{monthHeaderName}</h1>
            </div>
            {monthLoading ? <span className="text-sm text-ink-soft">Loading month…</span> : null}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="px-2 py-1 text-center text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                {label}
              </div>
            ))}

            {monthData?.weeks.flatMap((week, weekIndex) =>
              week.map((cell, dayIndex) => {
                if (!cell.dateKey) {
                  return (
                    <div
                      key={`blank-${weekIndex}-${dayIndex}`}
                      className="min-h-[112px] rounded-xl border border-dashed border-line bg-canvas opacity-25"
                      aria-hidden="true"
                    />
                  );
                }

                const selected = selectedDateKey === cell.dateKey;
                const visible = cell.completed.slice(0, 8);
                const hasVisibleIcons = visible.length > 0;
                const overflow = Math.max(0, cell.completed.length - 8);
                const isToday = cell.isToday;
                const cardClass = isToday
                  ? selected
                    ? 'border-ink bg-ink ring-2 ring-focus-ring'
                    : 'cursor-pointer border-ink bg-ink'
                  : selected
                    ? 'border-line bg-surface-muted ring-2 ring-focus-ring'
                    : 'cursor-pointer border-line bg-canvas hover:bg-active';
                const dayCircleClass = isToday ? 'bg-white text-ink' : 'bg-ink text-white';
                const overflowBadgeClass = isToday ? 'bg-white text-ink' : 'bg-ink text-canvas';

                return (
                  <button
                    type="button"
                    key={cell.dateKey}
                    onClick={() => setSelectedDateKey(cell.dateKey)}
                    className={[
                      'relative min-h-[112px] rounded-xl border p-3 text-left shadow-sm transition',
                      cardClass,
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'absolute left-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                        dayCircleClass,
                      ].join(' ')}
                    >
                      {cell.dayNumber}
                    </span>
                    {overflow > 0 ? (
                      <span
                        className={[
                          'absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          overflowBadgeClass,
                        ].join(' ')}
                      >
                        +{overflow}
                      </span>
                    ) : null}

                    {hasVisibleIcons ? (
                      <div className="grid grid-cols-4 gap-1.5 pt-12">
                        {visible.map((mission) => (
                          <span key={`${cell.dateKey}-${mission.id}`} className="flex h-6 w-6 items-center justify-center">
                            <MissionIcon mission={mission} muted={mission.is_archived} />
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                );
              }),
            )}
          </div>
        </section>

        <aside
          className="rounded-2xl border border-line p-3 shadow-soft md:p-4"
          style={{ backgroundColor: monthSidePaneBackground }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Day inspector</p>
              <h2 className="text-lg font-semibold text-ink">
                {selectedDateKey ? formatReadableDate(selectedDateKey) : 'Select a day'}
              </h2>
            </div>
          </div>

          {error ? (
            <div className="mb-3 rounded-lg border border-active bg-active-soft px-3 py-2 text-sm text-ink">{error}</div>
          ) : null}

          {!inspectorData || !draft ? (
            <div className="rounded-xl border border-dashed border-line bg-canvas p-4 text-sm text-ink-soft">
              Select a day to edit active missions and review archived completions.
            </div>
          ) : (
            <div className="flex h-full flex-col">
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
                <div className="mb-2 flex items-center justify-between">
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

              <div className="mt-4 flex gap-2 border-t border-line pt-3">
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
          )}
        </aside>
      </div>
    </main>
  );
}
