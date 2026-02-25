'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDateKeyLocal, parseDateKeyLocal } from '@/lib/date';
import { iconSrcForKey } from '@/lib/icon-catalog';
import type { AnalyticsGroupBy, DashboardAnalyticsResponse } from '@/types/dashboard';
import type { MissionRecord } from '@/types/habit';

type RangePreset = 'week' | 'month' | 'year' | 'custom';

type DashboardFilters = {
  preset: RangePreset;
  from: string;
  to: string;
  groupBy: AnalyticsGroupBy;
  taskIds: string[]; // empty means "All tasks"
};

type TrendSeries = {
  label: string;
  color: string;
  values: number[];
};

const GROUP_BY_OPTIONS: Array<{ value: AnalyticsGroupBy; label: string }> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

const MAX_TREND_SERIES = 4;

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function startOfWeekMonday(date: Date) {
  const offset = (date.getDay() + 6) % 7;
  return addDays(date, -offset);
}

function endOfWeekMonday(date: Date) {
  return addDays(startOfWeekMonday(date), 6);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

function endOfYear(date: Date) {
  return new Date(date.getFullYear(), 11, 31);
}

function getPresetRange(preset: Exclude<RangePreset, 'custom'>) {
  const now = new Date();
  if (preset === 'week') {
    return {
      from: formatDateKeyLocal(startOfWeekMonday(now)),
      to: formatDateKeyLocal(endOfWeekMonday(now)),
      groupBy: 'day' as AnalyticsGroupBy,
    };
  }
  if (preset === 'month') {
    return {
      from: formatDateKeyLocal(startOfMonth(now)),
      to: formatDateKeyLocal(endOfMonth(now)),
      groupBy: 'week' as AnalyticsGroupBy,
    };
  }
  return {
    from: formatDateKeyLocal(startOfYear(now)),
    to: formatDateKeyLocal(endOfYear(now)),
    groupBy: 'month' as AnalyticsGroupBy,
  };
}

function initialFilters(): DashboardFilters {
  const preset = getPresetRange('month');
  return {
    preset: 'month',
    from: preset.from,
    to: preset.to,
    groupBy: preset.groupBy,
    taskIds: [],
  };
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

function formatCount(value: number) {
  return value.toLocaleString();
}

function buildAnalyticsUrl(filters: Pick<DashboardFilters, 'from' | 'to' | 'groupBy' | 'taskIds'>) {
  const params = new URLSearchParams();
  params.set('from', filters.from);
  params.set('to', filters.to);
  params.set('groupBy', filters.groupBy);
  for (const taskId of filters.taskIds) params.append('taskId', taskId);
  return `/api/analytics?${params.toString()}`;
}

function isSingleMonthRange(from: string, to: string) {
  return from.slice(0, 7) === to.slice(0, 7);
}

function KpiTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-canvas p-3 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">{label}</div>
      <div className="mt-2 text-2xl font-semibold leading-none text-ink md:text-3xl">{value}</div>
      {hint ? <div className="mt-2 text-xs text-ink-faint">{hint}</div> : null}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-canvas p-3 shadow-sm md:p-4 ${className}`.trim()}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-ink md:text-base">{title}</h2>
          {subtitle ? <p className="text-xs text-ink-soft">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function TotalsBarChart({ rows }: { rows: DashboardAnalyticsResponse['totalsPerTask'] }) {
  if (rows.length === 0) {
    return <div className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-soft">No completions in this range.</div>;
  }

  const maxCount = Math.max(...rows.map((row) => row.count), 1);
  const visibleRows = rows.slice(0, 12);

  return (
    <div className="space-y-2">
      {visibleRows.map(({ task, count }) => (
        <div key={task.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <img src={iconSrcForKey(task.icon_key)} alt="" aria-hidden="true" className="h-6 w-6 object-contain" draggable={false} />
          <div className="min-w-0">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-ink">{task.name}</span>
              <span className="text-xs font-semibold text-ink-soft">{formatCount(count)}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(count / maxCount) * 100}%`,
                  backgroundColor: task.color_hex || 'var(--color-active)',
                }}
              />
            </div>
          </div>
          {task.is_archived ? <span className="text-[10px] font-semibold text-ink-faint">arch</span> : <span />}
        </div>
      ))}
      {rows.length > visibleRows.length ? (
        <div className="text-xs text-ink-soft">Showing top {visibleRows.length} tasks by completions.</div>
      ) : null}
    </div>
  );
}

function TrendChart({
  labels,
  series,
}: {
  labels: string[];
  series: TrendSeries[];
}) {
  const width = 920;
  const height = 260;
  const margin = { top: 14, right: 10, bottom: 44, left: 30 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const allValues = series.flatMap((line) => line.values);
  const maxValue = Math.max(0, ...allValues);
  const yMax = maxValue === 0 ? 1 : maxValue;
  const ticks = 4;

  function xFor(index: number) {
    if (labels.length <= 1) return margin.left + plotWidth / 2;
    return margin.left + (index / (labels.length - 1)) * plotWidth;
  }

  function yFor(value: number) {
    return margin.top + plotHeight - (value / yMax) * plotHeight;
  }

  if (labels.length === 0) {
    return <div className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-soft">No periods in selected range.</div>;
  }

  if (series.length === 0) {
    return <div className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-soft">No series to plot.</div>;
  }

  const labelStep = labels.length > 12 ? Math.ceil(labels.length / 8) : 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {series.map((line) => (
          <div key={line.label} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-1 text-xs text-ink">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: line.color }} />
            <span>{line.label}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-line bg-white/70 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label="Completion trend chart">
          {[...Array(ticks + 1)].map((_, index) => {
            const value = (yMax / ticks) * (ticks - index);
            const y = margin.top + (index / ticks) * plotHeight;
            return (
              <g key={`grid-${index}`}>
                <line x1={margin.left} x2={margin.left + plotWidth} y1={y} y2={y} stroke="rgba(94,95,171,0.18)" strokeWidth="1" />
                <text x={4} y={y + 4} fontSize="10" fill="rgba(94,95,171,0.72)">
                  {Math.round(value)}
                </text>
              </g>
            );
          })}

          {series.map((line) => {
            const points = line.values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(' ');
            return (
              <g key={`line-${line.label}`}>
                <polyline fill="none" stroke={line.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={points} />
                {line.values.map((value, index) => (
                  <circle key={`${line.label}-${index}`} cx={xFor(index)} cy={yFor(value)} r="2.5" fill={line.color} />
                ))}
              </g>
            );
          })}

          {labels.map((label, index) => {
            if (index % labelStep !== 0 && index !== labels.length - 1) return null;
            const x = xFor(index);
            return (
              <text
                key={`xlabel-${index}`}
                x={x}
                y={height - 12}
                fontSize="10"
                fill="rgba(94,95,171,0.76)"
                textAnchor={index === 0 ? 'start' : index === labels.length - 1 ? 'end' : 'middle'}
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function MonthlyBreakdownTable({ data }: { data: DashboardAnalyticsResponse }) {
  if (data.range.groupBy !== 'month') return null;

  const months = data.periods;
  const rows = data.timeSeriesPerTask.filter((series) => series.total > 0);

  return (
    <Panel title="Monthly Breakdown" subtitle="Per-task counts by month">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-canvas px-2 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                Task
              </th>
              {months.map((period) => (
                <th key={period.key} className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                  {period.shortLabel}
                </th>
              ))}
              <th className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={months.length + 2} className="px-2 py-4 text-center text-sm text-ink-soft">
                  No completion data for this monthly view.
                </td>
              </tr>
            ) : (
              rows.map((series) => (
                <tr key={series.task.id} className="border-t border-line/60">
                  <td className="sticky left-0 bg-canvas px-2 py-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={iconSrcForKey(series.task.icon_key)}
                        alt=""
                        aria-hidden="true"
                        className="h-5 w-5 object-contain"
                        draggable={false}
                      />
                      <span className="truncate font-medium text-ink">{series.task.name}</span>
                    </div>
                  </td>
                  {series.points.map((point) => (
                    <td key={`${series.task.id}-${point.periodKey}`} className="px-2 py-2 text-right text-ink">
                      {point.count || <span className="text-ink-faint">0</span>}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-right font-semibold text-ink">{series.total}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function MonthHeatmap({ dailyOverall, from }: Pick<DashboardAnalyticsResponse, 'dailyOverall'> & { from: string }) {
  const monthKey = from.slice(0, 7);
  const monthStart = parseDateKeyLocal(`${monthKey}-01`);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const countByDate = new Map(dailyOverall.map((row) => [row.dateKey, row.count] as const));
  const maxCount = Math.max(0, ...dailyOverall.map((row) => row.count));
  const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const leadingBlanks = (monthStart.getDay() + 6) % 7;
  const cells: Array<{ dateKey: string | null; day: number | null; count: number }> = [];
  for (let i = 0; i < leadingBlanks; i += 1) cells.push({ dateKey: null, day: null, count: 0 });
  for (let day = 1; day <= monthEnd.getDate(); day += 1) {
    const dateKey = `${monthKey}-${String(day).padStart(2, '0')}`;
    cells.push({ dateKey, day, count: countByDate.get(dateKey) ?? 0 });
  }
  while (cells.length % 7 !== 0) cells.push({ dateKey: null, day: null, count: 0 });

  function cellBg(count: number) {
    if (count <= 0) return 'rgba(255,255,255,0.75)';
    const alpha = Math.min(0.9, 0.2 + (count / Math.max(maxCount, 1)) * 0.7);
    return `rgba(255,128,160,${alpha})`;
  }

  return (
    <Panel title="Month Heatmap" subtitle={`Completion intensity for ${monthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`}>
      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((label) => (
          <div key={label} className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
            {label}
          </div>
        ))}
        {cells.map((cell, index) => (
          <div
            key={`${cell.dateKey ?? 'blank'}-${index}`}
            className={[
              'aspect-square rounded-md border text-[10px] leading-none',
              cell.dateKey ? 'border-line/60' : 'border-transparent',
            ].join(' ')}
            style={{
              backgroundColor: cell.dateKey ? cellBg(cell.count) : 'transparent',
              color: cell.count > 0 ? 'white' : 'var(--color-ink)',
            }}
            title={cell.dateKey ? `${cell.dateKey}: ${cell.count}` : undefined}
            aria-label={cell.dateKey ? `${cell.dateKey}, ${cell.count} completions` : undefined}
          >
            {cell.day ? <div className="flex h-full items-center justify-center font-semibold">{cell.day}</div> : null}
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-ink-soft">Darker pink means more completions on that day.</div>
    </Panel>
  );
}

function DashboardFilterBar({
  data,
  filters,
  loading,
  onPresetChange,
  onCustomDateChange,
  onGroupByChange,
  onSelectAllTasks,
  onToggleTask,
}: {
  data: DashboardAnalyticsResponse | null;
  filters: DashboardFilters;
  loading: boolean;
  onPresetChange: (preset: RangePreset) => void;
  onCustomDateChange: (field: 'from' | 'to', value: string) => void;
  onGroupByChange: (groupBy: AnalyticsGroupBy) => void;
  onSelectAllTasks: () => void;
  onToggleTask: (taskId: string) => void;
}) {
  const tasks = data?.availableTasks ?? [];
  const selectedCount = filters.taskIds.length;

  return (
    <div className="sticky top-0 z-20 mb-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Range</span>
          {(['week', 'month', 'year', 'custom'] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onPresetChange(preset)}
              className={[
                'rounded-full border px-3 py-1.5 text-sm font-medium transition',
                filters.preset === preset ? 'border-active bg-active-soft text-ink' : 'border-line bg-canvas text-ink hover:bg-surface-muted',
              ].join(' ')}
            >
              {preset === 'week' ? 'This week' : preset === 'month' ? 'This month' : preset === 'year' ? 'This year' : 'Custom'}
            </button>
          ))}
          {loading ? <span className="text-xs text-ink-soft">Updating…</span> : null}
        </div>

        <div className="grid gap-3 md:grid-cols-[auto_auto_1fr] md:items-center">
          <label className="flex items-center gap-2 text-sm text-ink">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">From</span>
            <input
              type="date"
              value={filters.from}
              onChange={(event) => onCustomDateChange('from', event.target.value)}
              className="rounded-lg border border-line bg-canvas px-2 py-1.5 text-sm text-ink"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">To</span>
            <input
              type="date"
              value={filters.to}
              onChange={(event) => onCustomDateChange('to', event.target.value)}
              className="rounded-lg border border-line bg-canvas px-2 py-1.5 text-sm text-ink"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink md:justify-end">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">Group by</span>
            <select
              value={filters.groupBy}
              onChange={(event) => onGroupByChange(event.target.value as AnalyticsGroupBy)}
              className="rounded-lg border border-line bg-canvas px-2 py-1.5 text-sm text-ink"
            >
              {GROUP_BY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">Tasks</span>
            <button
              type="button"
              onClick={onSelectAllTasks}
              className={[
                'rounded-full border px-3 py-1 text-sm font-medium transition',
                selectedCount === 0 ? 'border-active bg-active-soft text-ink' : 'border-line bg-canvas text-ink hover:bg-surface-muted',
              ].join(' ')}
            >
              All tasks
            </button>
            <span className="text-xs text-ink-soft">
              {selectedCount === 0 ? 'All selected' : `${selectedCount} selected`}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tasks.map((task) => {
              const selected = filters.taskIds.length === 0 || filters.taskIds.includes(task.id);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onToggleTask(task.id)}
                  className={[
                    'inline-flex items-center gap-2 rounded-full border px-2 py-1 text-sm transition',
                    selected ? 'border-active bg-canvas text-ink' : 'border-line bg-canvas/60 text-ink-soft hover:bg-surface-muted',
                  ].join(' ')}
                  title={task.name}
                >
                  <img src={iconSrcForKey(task.icon_key)} alt="" aria-hidden="true" className="h-4 w-4 object-contain" draggable={false} />
                  <span className="max-w-[10rem] truncate">{task.name}</span>
                  {selected ? <span className="text-[10px] font-semibold text-active">●</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardApp() {
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters);
  const [data, setData] = useState<DashboardAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchJson<DashboardAnalyticsResponse>(buildAnalyticsUrl(filters), {
          signal: controller.signal,
        });
        if (cancelled) return;
        setData(result);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load dashboard analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [filters]);

  function applyPreset(preset: RangePreset) {
    if (preset === 'custom') {
      setFilters((current) => ({ ...current, preset }));
      return;
    }

    const next = getPresetRange(preset);
    setFilters((current) => ({
      ...current,
      preset,
      from: next.from,
      to: next.to,
      groupBy: next.groupBy,
    }));
  }

  function setCustomDate(field: 'from' | 'to', value: string) {
    if (!value) return;
    setFilters((current) => {
      const next = { ...current, preset: 'custom' as const, [field]: value };
      if (next.from > next.to) {
        if (field === 'from') next.to = value;
        else next.from = value;
      }
      return next;
    });
  }

  function setGroupBy(groupBy: AnalyticsGroupBy) {
    setFilters((current) => ({ ...current, groupBy }));
  }

  function selectAllTasks() {
    setFilters((current) => ({ ...current, taskIds: [] }));
  }

  function toggleTask(taskId: string) {
    setFilters((current) => {
      const allTaskIds = data?.availableTasks.map((task) => task.id) ?? [];
      const currentSet = new Set(current.taskIds.length === 0 ? allTaskIds : current.taskIds);
      if (currentSet.has(taskId)) currentSet.delete(taskId);
      else currentSet.add(taskId);

      const nextTaskIds = Array.from(currentSet);
      if (nextTaskIds.length === 0 || nextTaskIds.length === allTaskIds.length) {
        return { ...current, taskIds: [] };
      }
      return { ...current, taskIds: nextTaskIds };
    });
  }

  const trendLabels = data?.periods.map((period) => period.shortLabel) ?? [];
  let trendSeries: TrendSeries[] = [];
  let trendNote: string | null = null;

  if (data) {
    const candidateSeries = data.timeSeriesPerTask.filter((series) => series.total > 0);
    if (candidateSeries.length > MAX_TREND_SERIES) {
      trendSeries = [
        {
          label: 'All tasks',
          color: '#5e5fab',
          values: data.overallPerPeriod.map((point) => point.count),
        },
      ];
      trendNote = `Showing combined trend because ${candidateSeries.length} task series would be too dense.`;
    } else {
      trendSeries = candidateSeries.map((series) => ({
        label: series.task.name,
        color: series.task.color_hex || '#ff80a0',
        values: series.points.map((point) => point.count),
      }));
      if (trendSeries.length === 0) {
        trendSeries = [
          {
            label: 'All tasks',
            color: '#5e5fab',
            values: data.overallPerPeriod.map((point) => point.count),
          },
        ];
      }
    }
  }

  const showHeatmap = data ? isSingleMonthRange(data.range.from, data.range.to) : false;

  return (
    <main className="calendar-viewport-shell p-3 md:p-4">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1600px] grid-cols-1 gap-3 md:h-full md:min-h-0 md:overflow-hidden">
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface p-3 shadow-soft md:p-4">
          <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ink-soft">Analytics</p>
              <h1 className="font-shardee text-3xl leading-none text-ink md:text-6xl">Dashboard</h1>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link href="/" className="rounded-xl border border-line bg-canvas px-3 py-2 text-sm font-semibold text-ink hover:bg-surface-muted">
                Calendar
              </Link>
              <Link
                href="/missions"
                className="rounded-xl border border-active bg-active-soft px-3 py-2 text-sm font-semibold text-ink hover:bg-active"
              >
                Missions
              </Link>
            </div>
          </header>

          <div className="touch-scroll-y min-h-0 flex-1 pr-1">
            <DashboardFilterBar
              data={data}
              filters={filters}
              loading={loading}
              onPresetChange={applyPreset}
              onCustomDateChange={setCustomDate}
              onGroupByChange={setGroupBy}
              onSelectAllTasks={selectAllTasks}
              onToggleTask={toggleTask}
            />

            {error ? (
              <div className="mb-3 rounded-xl border border-active bg-active-soft px-3 py-2 text-sm text-ink">{error}</div>
            ) : null}

            {!data ? (
              <div className="rounded-2xl border border-dashed border-line bg-canvas p-4 text-sm text-ink-soft">
                {loading ? 'Loading analytics…' : 'No analytics data available.'}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <KpiTile label="Total completions" value={formatCount(data.kpis.totalCompletions)} />
                  <KpiTile label="Unique tasks" value={formatCount(data.kpis.uniqueTasksCompleted)} />
                  <KpiTile label="Active days" value={formatCount(data.kpis.activeDays)} />
                  <KpiTile label="Best streak" value={`${data.kpis.bestStreak}d`} />
                  <KpiTile
                    label="Current streak"
                    value={`${data.kpis.currentStreak}d`}
                    hint={data.range.timezoneMode === 'local-date-key' ? 'Grouped by local calendar day' : undefined}
                  />
                </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
                  <Panel title="Totals by Task" subtitle={`${data.range.from} to ${data.range.to}`}>
                    <TotalsBarChart rows={data.totalsPerTask} />
                  </Panel>

                  <Panel title="Trend" subtitle={`Grouped by ${data.range.groupBy}`}>
                    {trendNote ? <div className="mb-3 text-xs text-ink-soft">{trendNote}</div> : null}
                    <TrendChart labels={trendLabels} series={trendSeries} />
                  </Panel>
                </div>

                {data.range.groupBy === 'month' ? <MonthlyBreakdownTable data={data} /> : null}

                {showHeatmap ? <MonthHeatmap dailyOverall={data.dailyOverall} from={data.range.from} /> : null}

                <Panel title="Overall Totals per Period" subtitle="All tasks combined for the selected grouping">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {data.periods.map((period, index) => {
                      const point = data.overallPerPeriod[index];
                      return (
                        <div key={period.key} className="rounded-xl border border-line bg-white/70 px-3 py-2">
                          <div className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">{period.shortLabel}</div>
                          <div className="mt-1 text-lg font-semibold text-ink">{point?.count ?? 0}</div>
                          <div className="text-[11px] text-ink-faint">
                            {period.startDateKey}
                            {period.startDateKey !== period.endDateKey ? ` → ${period.endDateKey}` : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

