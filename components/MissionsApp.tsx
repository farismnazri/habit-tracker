'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AVAILABLE_ICON_KEYS, DEFAULT_ICON_KEY, iconSrcForKey } from '@/lib/icon-catalog';
import { MissionIcon } from '@/components/MissionIcon';
import type { MissionRecord, MissionsResponse } from '@/types/habit';

type TabKey = 'active' | 'archived';

type MissionForm = {
  name: string;
  icon_key: string;
  color_hex: string;
};

const DEFAULT_FORM: MissionForm = {
  name: '',
  icon_key: DEFAULT_ICON_KEY,
  color_hex: '#5e5fab',
};

function toForm(mission: MissionRecord): MissionForm {
  return {
    name: mission.name,
    icon_key: mission.icon_key,
    color_hex: mission.color_hex,
  };
}

function formsEqual(a: MissionForm, b: MissionForm) {
  return a.name === b.name && a.icon_key === b.icon_key && a.color_hex.toLowerCase() === b.color_hex.toLowerCase();
}

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

function IconPickerButton({
  iconKey,
  selected,
  disabled,
  onSelect,
}: {
  iconKey: string;
  selected: boolean;
  disabled: boolean;
  onSelect: (iconKey: string) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      title={iconKey}
      disabled={disabled}
      onClick={() => onSelect(iconKey)}
      className={[
        'flex aspect-square items-center justify-center rounded-lg border p-1 transition',
        selected ? 'border-active bg-active-soft ring-2 ring-focus-ring' : 'border-line bg-canvas hover:bg-surface-muted',
        disabled ? 'cursor-not-allowed opacity-60' : '',
      ].join(' ')}
    >
      <img
        src={iconSrcForKey(iconKey)}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-contain"
        draggable={false}
      />
      <span className="sr-only">{iconKey}</span>
    </button>
  );
}

export function MissionsApp() {
  const [missions, setMissions] = useState<MissionsResponse>({ active: [], archived: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('active');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<MissionForm>(DEFAULT_FORM);
  const [baselineForm, setBaselineForm] = useState<MissionForm>(DEFAULT_FORM);
  const [isNewMission, setIsNewMission] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const selectedMission =
    missions.active.find((mission) => mission.id === selectedId) ?? missions.archived.find((mission) => mission.id === selectedId) ?? null;

  useEffect(() => {
    loadMissions();
  }, []);

  async function loadMissions(preferredId?: string | null) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<MissionsResponse>('/api/missions');
      setMissions(data);
      setSelectedId((current) => {
        const nextId = preferredId ?? current;
        const exists = nextId && [...data.active, ...data.archived].some((mission) => mission.id === nextId);
        if (exists) return nextId;
        return data.active[0]?.id ?? data.archived[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load missions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedMission) {
      if (!isNewMission) {
        setForm(DEFAULT_FORM);
        setBaselineForm(DEFAULT_FORM);
      }
      return;
    }

    if (isNewMission) return;
    const nextForm = toForm(selectedMission);
    setForm(nextForm);
    setBaselineForm(nextForm);
  }, [selectedMission, isNewMission]);

  function startNewMission() {
    setIsNewMission(true);
    setSelectedId(null);
    setTab('active');
    setForm(DEFAULT_FORM);
    setBaselineForm(DEFAULT_FORM);
    setError(null);
  }

  function selectMission(mission: MissionRecord) {
    setIsNewMission(false);
    setSelectedId(mission.id);
    setTab(mission.is_archived ? 'archived' : 'active');
    setError(null);
  }

  function cancelEdits() {
    setForm(baselineForm);
    setError(null);
  }

  async function saveMission() {
    setSaving(true);
    setError(null);
    try {
      if (isNewMission) {
        const created = await fetchJson<MissionRecord>('/api/missions', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        setIsNewMission(false);
        await loadMissions(created.id);
      } else if (selectedMission) {
        await fetchJson<MissionRecord>(`/api/missions/${selectedMission.id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
        await loadMissions(selectedMission.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mission');
    } finally {
      setSaving(false);
    }
  }

  async function archiveSelectedMission() {
    if (!selectedMission || selectedMission.is_archived) return;
    setSaving(true);
    setError(null);
    try {
      const data = await fetchJson<MissionsResponse>(`/api/missions/${selectedMission.id}/archive`, { method: 'POST' });
      setMissions(data);
      setTab('archived');
      setSelectedId(selectedMission.id);
      setIsNewMission(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive mission');
    } finally {
      setSaving(false);
    }
  }

  async function restoreSelectedMission() {
    if (!selectedMission || !selectedMission.is_archived) return;
    setSaving(true);
    setError(null);
    try {
      const data = await fetchJson<MissionsResponse>(`/api/missions/${selectedMission.id}/restore`, { method: 'POST' });
      setMissions(data);
      setTab('active');
      setSelectedId(selectedMission.id);
      setIsNewMission(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore mission');
    } finally {
      setSaving(false);
    }
  }

  async function moveMissionViaDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) return;

    const currentActive = [...missions.active];
    const fromIndex = currentActive.findIndex((mission) => mission.id === draggingId);
    const toIndex = currentActive.findIndex((mission) => mission.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const reordered = [...currentActive];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    setMissions((prev) => ({ ...prev, active: reordered }));
    setError(null);

    try {
      const data = await fetchJson<MissionsResponse>('/api/missions/reorder', {
        method: 'POST',
        body: JSON.stringify({ orderedIds: reordered.map((mission) => mission.id) }),
      });
      setMissions(data);
    } catch (err) {
      setMissions((prev) => ({ ...prev, active: currentActive }));
      setError(err instanceof Error ? err.message : 'Failed to reorder missions');
    } finally {
      setDraggingId(null);
    }
  }

  const visibleList = tab === 'active' ? missions.active : missions.archived;
  const isDirty = isNewMission ? !formsEqual(form, DEFAULT_FORM) : !formsEqual(form, baselineForm);

  return (
    <main className="min-h-screen p-3 md:p-4">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1600px] grid-cols-1 gap-3 md:min-h-[calc(100vh-2rem)] md:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-line bg-surface p-3 shadow-soft md:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Missions</p>
              <h1 className="text-xl font-semibold text-ink">Manage priorities</h1>
            </div>
            <Link href="/" className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm font-medium text-ink hover:bg-surface-muted">
              Calendar
            </Link>
          </div>

          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setTab('active')}
              className={[
                'flex-1 rounded-lg px-3 py-2 text-sm font-semibold',
                tab === 'active' ? 'border border-active bg-active text-ink' : 'border border-line bg-canvas text-ink',
              ].join(' ')}
            >
              Active ({missions.active.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('archived')}
              className={[
                'flex-1 rounded-lg px-3 py-2 text-sm font-semibold',
                tab === 'archived'
                  ? 'border border-line bg-surface-muted text-ink'
                  : 'border border-line bg-canvas text-ink',
              ].join(' ')}
            >
              Archived ({missions.archived.length})
            </button>
          </div>

          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={startNewMission}
              className="flex-1 rounded-lg border border-active bg-active-soft px-3 py-2 text-sm font-semibold text-ink hover:bg-active"
            >
              New mission
            </button>
            <button
              type="button"
              onClick={() => loadMissions(selectedId)}
              className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm font-medium text-ink hover:bg-surface-muted"
            >
              Refresh
            </button>
          </div>

          {error ? (
            <div className="mb-3 rounded-lg border border-active bg-active-soft px-3 py-2 text-sm text-ink">{error}</div>
          ) : null}

          <div className="space-y-2 overflow-y-auto pr-1 md:max-h-[calc(100vh-14rem)]">
            {loading ? (
              <div className="rounded-xl border border-dashed border-line bg-canvas p-4 text-sm text-ink-soft">Loading…</div>
            ) : visibleList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-canvas p-4 text-sm text-ink-soft">
                {tab === 'active' ? 'No active missions yet.' : 'No archived missions.'}
              </div>
            ) : (
              visibleList.map((mission) => {
                const selected = !isNewMission && mission.id === selectedId;
                return (
                  <div
                    key={mission.id}
                    draggable={tab === 'active'}
                    onDragStart={(event) => {
                      if (tab !== 'active') return;
                      setDraggingId(mission.id);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', mission.id);
                    }}
                    onDragOver={(event) => {
                      if (tab !== 'active') return;
                      event.preventDefault();
                    }}
                    onDrop={(event) => {
                      if (tab !== 'active') return;
                      event.preventDefault();
                      void moveMissionViaDrop(mission.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className={[
                      'flex items-center gap-3 rounded-xl border px-3 py-2 shadow-sm',
                      selected ? 'border-active bg-active-soft' : 'border-line bg-canvas',
                      draggingId === mission.id ? 'opacity-60' : '',
                      tab === 'active' ? 'cursor-grab' : '',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      onClick={() => selectMission(mission)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span
                        className={[
                          'inline-flex h-7 w-7 items-center justify-center rounded-lg border text-sm text-ink-soft',
                          tab === 'active' ? 'border-line bg-surface-muted' : 'border-line bg-surface',
                        ].join(' ')}
                        aria-hidden="true"
                      >
                        {tab === 'active' ? '⋮⋮' : '•'}
                      </span>
                      <MissionIcon mission={mission} size="md" muted={mission.is_archived} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{mission.name}</span>
                        <span className="block truncate text-xs text-ink-faint">
                          {mission.icon_key} · {mission.color_hex} · #{mission.sort_order}
                        </span>
                      </span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <section className="rounded-2xl border border-line bg-surface p-3 shadow-soft md:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Editor</p>
              <h2 className="text-xl font-semibold text-ink">
                {isNewMission ? 'New mission' : selectedMission ? selectedMission.name : 'Select a mission'}
              </h2>
            </div>
            {selectedMission?.is_archived ? (
              <span className="rounded-full border border-line bg-surface-muted px-3 py-1 text-xs font-semibold text-ink">
                Archived
              </span>
            ) : null}
          </div>

          {!isNewMission && !selectedMission ? (
            <div className="rounded-xl border border-dashed border-line bg-canvas p-5 text-sm text-ink-soft">
              Pick a mission from the list or create a new one.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-ink">Name</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    disabled={!!selectedMission?.is_archived && !isNewMission}
                    className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-active focus:ring-2 focus:ring-focus-ring"
                    placeholder="Drink water"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-ink">icon_key</span>
                  <input
                    type="text"
                    value={form.icon_key}
                    onChange={(event) => setForm((prev) => ({ ...prev, icon_key: event.target.value }))}
                    disabled={!!selectedMission?.is_archived && !isNewMission}
                    className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-active focus:ring-2 focus:ring-focus-ring"
                    placeholder={DEFAULT_ICON_KEY}
                  />
                </label>

                <div className="rounded-xl border border-line bg-canvas p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink">Icon picker</p>
                    <p className="truncate text-xs text-ink-faint">{form.icon_key || DEFAULT_ICON_KEY}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2 md:grid-cols-5">
                    {AVAILABLE_ICON_KEYS.map((iconKey) => (
                      <IconPickerButton
                        key={iconKey}
                        iconKey={iconKey}
                        selected={form.icon_key === iconKey}
                        disabled={!!selectedMission?.is_archived && !isNewMission}
                        onSelect={(nextIconKey) => setForm((prev) => ({ ...prev, icon_key: nextIconKey }))}
                      />
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-ink">color_hex</span>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(form.color_hex) ? form.color_hex : '#5e5fab'}
                      onChange={(event) => setForm((prev) => ({ ...prev, color_hex: event.target.value }))}
                      disabled={!!selectedMission?.is_archived && !isNewMission}
                      className="h-10 w-12 rounded border border-line bg-canvas p-1"
                    />
                    <input
                      type="text"
                      value={form.color_hex}
                      onChange={(event) => setForm((prev) => ({ ...prev, color_hex: event.target.value }))}
                      disabled={!!selectedMission?.is_archived && !isNewMission}
                      className="flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-active focus:ring-2 focus:ring-focus-ring"
                      placeholder="#ff80a0"
                    />
                  </div>
                </label>
              </div>

              <div className="space-y-3 rounded-xl border border-line bg-canvas p-4">
                <p className="text-sm font-semibold text-ink">Preview</p>
                <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
                  <MissionIcon
                    mission={{
                      is_archived: !!selectedMission?.is_archived,
                      name: form.name || 'Mission',
                      icon_key: form.icon_key || DEFAULT_ICON_KEY,
                      color_hex: /^#[0-9a-fA-F]{6}$/.test(form.color_hex) ? form.color_hex : '#5e5fab',
                    }}
                    size="md"
                    muted={!!selectedMission?.is_archived}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{form.name || 'Mission'}</p>
                    <p className="truncate text-xs text-ink-faint">
                      {form.icon_key || DEFAULT_ICON_KEY} · {form.color_hex || '#5e5fab'}
                    </p>
                  </div>
                </div>

                {!selectedMission?.is_archived || isNewMission ? (
                  <>
                    <button
                      type="button"
                      onClick={saveMission}
                      disabled={saving || !isDirty}
                      className="w-full rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-canvas disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdits}
                      disabled={saving || !isDirty}
                      className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : null}

                {selectedMission && !selectedMission.is_archived ? (
                  <button
                    type="button"
                    onClick={archiveSelectedMission}
                    disabled={saving}
                    className="w-full rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm font-semibold text-ink"
                  >
                    Archive (preserve history)
                  </button>
                ) : null}

                {selectedMission?.is_archived ? (
                  <button
                    type="button"
                    onClick={restoreSelectedMission}
                    disabled={saving}
                    className="w-full rounded-lg border border-active bg-active-soft px-3 py-2 text-sm font-semibold text-ink"
                  >
                    Restore to active
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
