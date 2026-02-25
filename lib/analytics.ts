import { z } from 'zod';
import { formatDateKeyLocal, parseDateKeyLocal, todayDateKeyLocal } from '@/lib/date';
import { prisma } from '@/lib/prisma';
import type { DashboardAnalyticsResponse, AnalyticsGroupBy, AnalyticsPeriod } from '@/types/dashboard';
import type { MissionRecord } from '@/types/habit';

const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const dateKeySchema = z
  .string()
  .regex(DATE_KEY_REGEX, 'Expected YYYY-MM-DD')
  .refine((value) => !Number.isNaN(parseDateKeyLocal(value).getTime()), 'Invalid date');

export const analyticsFilterSchema = z
  .object({
    from: dateKeySchema,
    to: dateKeySchema,
    groupBy: z.enum(['day', 'week', 'month', 'year']).default('day'),
    taskIds: z.array(z.string().trim().min(1)).default([]),
  })
  .refine((value) => value.from <= value.to, {
    path: ['to'],
    message: 'to must be on or after from',
  });

export type AnalyticsFilters = z.infer<typeof analyticsFilterSchema>;

function sortMissionsForAnalytics(a: MissionRecord, b: MissionRecord) {
  if (a.is_archived !== b.is_archived) return a.is_archived ? 1 : -1;
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.id.localeCompare(b.id);
}

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

function nextPeriodStart(date: Date, groupBy: AnalyticsGroupBy) {
  if (groupBy === 'day') return addDays(date, 1);
  if (groupBy === 'week') return addDays(date, 7);
  if (groupBy === 'month') return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return new Date(date.getFullYear() + 1, 0, 1);
}

function periodStartForDate(date: Date, groupBy: AnalyticsGroupBy) {
  if (groupBy === 'day') return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (groupBy === 'week') return startOfWeekMonday(date);
  if (groupBy === 'month') return startOfMonth(date);
  return startOfYear(date);
}

function periodEndForDate(date: Date, groupBy: AnalyticsGroupBy) {
  if (groupBy === 'day') return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (groupBy === 'week') return endOfWeekMonday(date);
  if (groupBy === 'month') return endOfMonth(date);
  return endOfYear(date);
}

function clampDate(date: Date, min: Date, max: Date) {
  if (date < min) return new Date(min.getFullYear(), min.getMonth(), min.getDate());
  if (date > max) return new Date(max.getFullYear(), max.getMonth(), max.getDate());
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatMonthShort(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short' });
}

function formatMonthShortYear(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function formatMonthDay(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatMonthDayYear(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function periodKeyFromStart(start: Date, groupBy: AnalyticsGroupBy) {
  if (groupBy === 'day') return formatDateKeyLocal(start);
  if (groupBy === 'week') return `week:${formatDateKeyLocal(start)}`;
  if (groupBy === 'month') return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
  return String(start.getFullYear());
}

function buildPeriodLabels(start: Date, end: Date, groupBy: AnalyticsGroupBy) {
  if (groupBy === 'day') {
    return {
      shortLabel: formatMonthDay(start),
      label: formatMonthDayYear(start),
    };
  }

  if (groupBy === 'week') {
    const sameYear = start.getFullYear() === end.getFullYear();
    const sameMonth = sameYear && start.getMonth() === end.getMonth();
    return {
      shortLabel: sameMonth ? `${start.getDate()}-${end.getDate()} ${formatMonthShort(start)}` : `${formatMonthDay(start)}-${formatMonthDay(end)}`,
      label: `${formatMonthDayYear(start)} - ${formatMonthDayYear(end)}`,
    };
  }

  if (groupBy === 'month') {
    return {
      shortLabel: formatMonthShort(start),
      label: formatMonthShortYear(start),
    };
  }

  return {
    shortLabel: String(start.getFullYear()),
    label: String(start.getFullYear()),
  };
}

function buildPeriods(fromDateKey: string, toDateKey: string, groupBy: AnalyticsGroupBy): AnalyticsPeriod[] {
  const rangeStart = parseDateKeyLocal(fromDateKey);
  const rangeEnd = parseDateKeyLocal(toDateKey);

  let cursor = periodStartForDate(rangeStart, groupBy);
  const periods: AnalyticsPeriod[] = [];

  while (cursor <= rangeEnd) {
    const rawStart = periodStartForDate(cursor, groupBy);
    const rawEnd = periodEndForDate(cursor, groupBy);
    const clippedStart = clampDate(rawStart, rangeStart, rangeEnd);
    const clippedEnd = clampDate(rawEnd, rangeStart, rangeEnd);
    const { label, shortLabel } = buildPeriodLabels(clippedStart, clippedEnd, groupBy);

    periods.push({
      key: periodKeyFromStart(rawStart, groupBy),
      label,
      shortLabel,
      startDateKey: formatDateKeyLocal(clippedStart),
      endDateKey: formatDateKeyLocal(clippedEnd),
    });

    cursor = nextPeriodStart(rawStart, groupBy);
  }

  return periods;
}

function periodKeyForDateKey(dateKey: string, groupBy: AnalyticsGroupBy) {
  const date = parseDateKeyLocal(dateKey);
  return periodKeyFromStart(periodStartForDate(date, groupBy), groupBy);
}

function buildDailyRange(fromDateKey: string, toDateKey: string) {
  const rows: string[] = [];
  let cursor = parseDateKeyLocal(fromDateKey);
  const end = parseDateKeyLocal(toDateKey);
  while (cursor <= end) {
    rows.push(formatDateKeyLocal(cursor));
    cursor = addDays(cursor, 1);
  }
  return rows;
}

function calculateStreaks(dailyCounts: Map<string, number>, fromDateKey: string, toDateKey: string) {
  const allDays = buildDailyRange(fromDateKey, toDateKey);

  let bestStreak = 0;
  let currentRun = 0;
  let activeDays = 0;
  for (const day of allDays) {
    const count = dailyCounts.get(day) ?? 0;
    if (count > 0) {
      activeDays += 1;
      currentRun += 1;
      if (currentRun > bestStreak) bestStreak = currentRun;
    } else {
      currentRun = 0;
    }
  }

  const todayKey = todayDateKeyLocal();
  const anchorDateKey = todayKey < fromDateKey ? fromDateKey : todayKey > toDateKey ? toDateKey : todayKey;
  let currentStreak = 0;
  let cursor = parseDateKeyLocal(anchorDateKey);
  const from = parseDateKeyLocal(fromDateKey);

  while (cursor >= from) {
    const key = formatDateKeyLocal(cursor);
    if ((dailyCounts.get(key) ?? 0) <= 0) break;
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  return {
    bestStreak,
    currentStreak,
    activeDays,
  };
}

export async function getDashboardAnalytics(input: AnalyticsFilters): Promise<DashboardAnalyticsResponse> {
  const filters = analyticsFilterSchema.parse(input);

  const availableTasks = await prisma.mission.findMany({
    orderBy: [{ is_archived: 'asc' }, { sort_order: 'asc' }, { id: 'asc' }],
  });
  availableTasks.sort(sortMissionsForAnalytics);

  const availableTaskIdSet = new Set(availableTasks.map((task) => task.id));
  const selectedTaskIds = Array.from(
    new Set(filters.taskIds.filter((taskId) => availableTaskIdSet.has(taskId))),
  );
  const isAllTasks = selectedTaskIds.length === 0;
  const appliedTaskIds = isAllTasks ? availableTasks.map((task) => task.id) : selectedTaskIds;
  const appliedTaskIdSet = new Set(appliedTaskIds);

  const periods = buildPeriods(filters.from, filters.to, filters.groupBy);
  const periodKeys = periods.map((period) => period.key);
  const periodIndexByKey = new Map(periodKeys.map((key, index) => [key, index]));

  const completions =
    appliedTaskIds.length === 0
      ? []
      : await prisma.completion.findMany({
          where: {
            date: { gte: filters.from, lte: filters.to },
            is_done: true,
            mission_id: { in: appliedTaskIds },
          },
          select: {
            mission_id: true,
            date: true,
          },
          orderBy: [{ date: 'asc' }, { mission_id: 'asc' }],
        });

  const taskById = new Map(availableTasks.map((task) => [task.id, task] as const));
  const totalByTaskId = new Map<string, number>();
  const dailyOverallMap = new Map<string, number>();
  const overallPeriodCounts = Array.from({ length: periods.length }, () => 0);
  const taskPeriodCountsByTaskId = new Map<string, number[]>();

  for (const completion of completions) {
    if (!appliedTaskIdSet.has(completion.mission_id)) continue;

    totalByTaskId.set(completion.mission_id, (totalByTaskId.get(completion.mission_id) ?? 0) + 1);
    dailyOverallMap.set(completion.date, (dailyOverallMap.get(completion.date) ?? 0) + 1);

    const periodKey = periodKeyForDateKey(completion.date, filters.groupBy);
    const periodIndex = periodIndexByKey.get(periodKey);
    if (periodIndex !== undefined) {
      overallPeriodCounts[periodIndex] += 1;

      const taskSeries = taskPeriodCountsByTaskId.get(completion.mission_id) ?? Array.from({ length: periods.length }, () => 0);
      taskSeries[periodIndex] += 1;
      taskPeriodCountsByTaskId.set(completion.mission_id, taskSeries);
    }
  }

  const taskIdsForResponse = (isAllTasks ? availableTasks.map((task) => task.id) : selectedTaskIds).filter((taskId) => {
    if (!isAllTasks) return true;
    return (totalByTaskId.get(taskId) ?? 0) > 0;
  });

  const totalsPerTask = taskIdsForResponse
    .map((taskId) => {
      const task = taskById.get(taskId);
      if (!task) return null;
      return {
        task,
        count: totalByTaskId.get(taskId) ?? 0,
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return sortMissionsForAnalytics(a.task, b.task);
    });

  const timeSeriesPerTask = totalsPerTask.map(({ task, count }) => {
    const seriesCounts = taskPeriodCountsByTaskId.get(task.id) ?? Array.from({ length: periods.length }, () => 0);
    return {
      task,
      total: count,
      points: periods.map((period, index) => ({
        periodKey: period.key,
        count: seriesCounts[index] ?? 0,
      })),
    };
  });

  const dailyOverall = buildDailyRange(filters.from, filters.to).map((dateKey) => ({
    dateKey,
    count: dailyOverallMap.get(dateKey) ?? 0,
  }));

  const kpiStreaks = calculateStreaks(dailyOverallMap, filters.from, filters.to);

  return {
    range: {
      from: filters.from,
      to: filters.to,
      groupBy: filters.groupBy,
      timezoneMode: 'local-date-key',
    },
    taskFilter: {
      isAllTasks,
      selectedTaskIds,
      appliedTaskIds,
    },
    availableTasks,
    periods,
    kpis: {
      totalCompletions: completions.length,
      uniqueTasksCompleted: totalsPerTask.filter((row) => row.count > 0).length,
      bestStreak: kpiStreaks.bestStreak,
      currentStreak: kpiStreaks.currentStreak,
      activeDays: kpiStreaks.activeDays,
    },
    totalsPerTask,
    timeSeriesPerTask,
    overallPerPeriod: periods.map((period, index) => ({
      periodKey: period.key,
      count: overallPeriodCounts[index] ?? 0,
    })),
    dailyOverall,
  };
}
