export type MissionRecord = {
  id: string;
  name: string;
  icon_key: string;
  color_hex: string;
  sort_order: number;
  is_archived: boolean;
};

export type CalendarDayMission = Pick<
  MissionRecord,
  'id' | 'name' | 'icon_key' | 'color_hex' | 'sort_order' | 'is_archived'
>;

export type CalendarCell = {
  dateKey: string | null;
  dayNumber: number | null;
  isCurrentMonth: boolean;
  isToday: boolean;
  completed: CalendarDayMission[];
};

export type CalendarMonthResponse = {
  monthKey: string;
  monthLabel: string;
  weeks: CalendarCell[][];
  selectedDefaultDateKey: string | null;
};

export type DayInspectorResponse = {
  dateKey: string;
  activeMissions: MissionRecord[];
  checkedActiveMissionIds: string[];
  archivedCompletedMissions: MissionRecord[];
};

export type MissionsResponse = {
  active: MissionRecord[];
  archived: MissionRecord[];
};
