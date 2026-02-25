import type { MissionRecord } from '@/types/habit';

export type AnalyticsGroupBy = 'day' | 'week' | 'month' | 'year';

export type AnalyticsPeriod = {
  key: string;
  label: string;
  shortLabel: string;
  startDateKey: string;
  endDateKey: string;
};

export type AnalyticsCountByPeriod = {
  periodKey: string;
  count: number;
};

export type AnalyticsTaskTotal = {
  task: MissionRecord;
  count: number;
};

export type AnalyticsTaskSeries = {
  task: MissionRecord;
  total: number;
  points: AnalyticsCountByPeriod[];
};

export type DashboardAnalyticsKpis = {
  totalCompletions: number;
  uniqueTasksCompleted: number;
  bestStreak: number;
  currentStreak: number;
  activeDays: number;
};

export type DashboardAnalyticsResponse = {
  range: {
    from: string;
    to: string;
    groupBy: AnalyticsGroupBy;
    timezoneMode: 'local-date-key';
  };
  taskFilter: {
    isAllTasks: boolean;
    selectedTaskIds: string[];
    appliedTaskIds: string[];
  };
  availableTasks: MissionRecord[];
  periods: AnalyticsPeriod[];
  kpis: DashboardAnalyticsKpis;
  totalsPerTask: AnalyticsTaskTotal[];
  timeSeriesPerTask: AnalyticsTaskSeries[];
  overallPerPeriod: AnalyticsCountByPeriod[];
  dailyOverall: Array<{ dateKey: string; count: number }>;
};

