import { z } from 'zod';
import { AVAILABLE_ICON_KEY_SET } from '@/lib/icon-catalog';
import { prisma } from '@/lib/prisma';
import {
  formatDateKeyLocal,
  getMonthGridDates,
  getMonthMeta,
  parseDateKeyLocal,
  todayDateKeyLocal,
} from '@/lib/date';
import type {
  CalendarCell,
  CalendarMonthResponse,
  DayInspectorResponse,
  MissionRecord,
  MissionsResponse,
} from '@/types/habit';

const missionPayloadSchema = z.object({
  name: z.string().trim().min(1).max(80),
  icon_key: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .regex(/^[a-zA-Z0-9_.-]+\.svg$/)
    .refine((value) => AVAILABLE_ICON_KEY_SET.has(value), 'icon_key must match a file in /public/icons'),
  color_hex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
});

async function findMissionUsingIconKey(iconKey: string, excludeMissionId?: string) {
  return prisma.mission.findFirst({
    where: {
      icon_key: iconKey,
      ...(excludeMissionId ? { NOT: { id: excludeMissionId } } : {}),
    },
    select: {
      id: true,
      name: true,
      is_archived: true,
    },
  });
}

async function assertMissionIconKeyAvailable(iconKey: string, excludeMissionId?: string) {
  const existing = await findMissionUsingIconKey(iconKey, excludeMissionId);
  if (!existing) return;

  throw new Error(
    `Icon ${iconKey} is already in use by ${existing.name}${existing.is_archived ? ' (archived)' : ''}. Pick a different icon.`,
  );
}

function sortMissions(a: { sort_order: number; id: string }, b: { sort_order: number; id: string }) {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.id.localeCompare(b.id);
}

function sortCalendarDayCellMissions(
  a: Pick<MissionRecord, 'is_archived' | 'sort_order' | 'id'>,
  b: Pick<MissionRecord, 'is_archived' | 'sort_order' | 'id'>,
) {
  if (a.is_archived !== b.is_archived) {
    return a.is_archived ? 1 : -1;
  }
  return sortMissions(a, b);
}

let didRunCalendarDayCellOrderingCheck = false;

function ensureCalendarDayCellOrderingRuleCheck() {
  if (didRunCalendarDayCellOrderingCheck) return;

  const sample: Pick<MissionRecord, 'id' | 'is_archived' | 'sort_order'>[] = [
    { id: 'archived-top-priority', is_archived: true, sort_order: 0 },
    { id: 'active-mid-priority', is_archived: false, sort_order: 5 },
    { id: 'archived-late-priority', is_archived: true, sort_order: 9 },
    { id: 'active-top-priority', is_archived: false, sort_order: 1 },
  ];

  const actual = [...sample].sort(sortCalendarDayCellMissions).map((mission) => mission.id);
  const expected = [
    'active-top-priority',
    'active-mid-priority',
    'archived-top-priority',
    'archived-late-priority',
  ];

  if (actual.join('|') !== expected.join('|')) {
    throw new Error(`Calendar day-cell ordering regression: expected ${expected.join(', ')} but got ${actual.join(', ')}`);
  }

  didRunCalendarDayCellOrderingCheck = true;
}

function assertDateKey(dateKey: string): string {
  const parsed = parseDateKeyLocal(dateKey);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid date');
  }
  return formatDateKeyLocal(parsed);
}

export async function getCalendarMonth(monthKey: string): Promise<CalendarMonthResponse> {
  ensureCalendarDayCellOrderingRuleCheck();
  const monthMeta = getMonthMeta(monthKey);
  const todayKey = todayDateKeyLocal();

  const completions = await prisma.completion.findMany({
    where: {
      date: {
        gte: monthMeta.startDateKey,
        lte: monthMeta.endDateKey,
      },
      is_done: true,
    },
    include: {
      mission: true,
    },
    orderBy: [{ date: 'asc' }],
  });

  const completedByDate = new Map<string, MissionRecord[]>();
  for (const completion of completions) {
    const list = completedByDate.get(completion.date) ?? [];
    list.push(completion.mission);
    completedByDate.set(completion.date, list);
  }

  for (const [, list] of completedByDate) {
    list.sort(sortCalendarDayCellMissions);
  }

  const weeks = getMonthGridDates(monthKey).map((week) =>
    week.map<CalendarCell>((date) => {
      if (!date) {
        return {
          dateKey: null,
          dayNumber: null,
          isCurrentMonth: false,
          isToday: false,
          completed: [],
        };
      }

      const dateKey = formatDateKeyLocal(date);
      return {
        dateKey,
        dayNumber: date.getDate(),
        isCurrentMonth: true,
        isToday: dateKey === todayKey,
        completed: completedByDate.get(dateKey) ?? [],
      };
    }),
  );

  const defaultDateInMonth =
    todayKey >= monthMeta.startDateKey && todayKey <= monthMeta.endDateKey ? todayKey : monthMeta.startDateKey;

  return {
    monthKey,
    monthLabel: monthMeta.monthLabel,
    weeks,
    selectedDefaultDateKey: defaultDateInMonth,
  };
}

export async function getDayInspector(dateKey: string): Promise<DayInspectorResponse> {
  const normalizedDateKey = assertDateKey(dateKey);

  const [activeMissions, doneCompletionsForDay] = await Promise.all([
    prisma.mission.findMany({
      where: { is_archived: false },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    }),
    prisma.completion.findMany({
      where: { date: normalizedDateKey, is_done: true },
      include: { mission: true },
    }),
  ]);

  const checkedActiveMissionIds: string[] = [];
  const archivedCompletedMissions: MissionRecord[] = [];

  for (const completion of doneCompletionsForDay) {
    if (completion.mission.is_archived) {
      archivedCompletedMissions.push(completion.mission);
    } else {
      checkedActiveMissionIds.push(completion.mission_id);
    }
  }

  archivedCompletedMissions.sort(sortMissions);
  checkedActiveMissionIds.sort((a, b) => {
    const aMission = activeMissions.find((m) => m.id === a);
    const bMission = activeMissions.find((m) => m.id === b);
    if (!aMission || !bMission) return a.localeCompare(b);
    return sortMissions(aMission, bMission);
  });

  return {
    dateKey: normalizedDateKey,
    activeMissions,
    checkedActiveMissionIds,
    archivedCompletedMissions,
  };
}

export async function saveDaySelections(dateKey: string, checkedMissionIds: string[]) {
  const normalizedDateKey = assertDateKey(dateKey);
  const activeMissions = await prisma.mission.findMany({
    where: { is_archived: false },
    select: { id: true },
  });

  const activeIdSet = new Set(activeMissions.map((mission) => mission.id));
  const checkedFiltered = Array.from(new Set(checkedMissionIds.filter((id) => activeIdSet.has(id))));
  const activeIds = activeMissions.map((mission) => mission.id);

  await prisma.$transaction(async (tx) => {
    if (activeIds.length > 0) {
      await tx.completion.deleteMany({
        where: { date: normalizedDateKey, mission_id: { in: activeIds } },
      });
    }

    if (checkedFiltered.length > 0) {
      await tx.completion.createMany({
        data: checkedFiltered.map((missionId) => ({
          mission_id: missionId,
          date: normalizedDateKey,
          is_done: true,
        })),
      });
    }
  });

  return getDayInspector(normalizedDateKey);
}

export async function getMissions(): Promise<MissionsResponse> {
  const missions = await prisma.mission.findMany({
    orderBy: [{ is_archived: 'asc' }, { sort_order: 'asc' }, { id: 'asc' }],
  });

  return {
    active: missions.filter((mission) => !mission.is_archived),
    archived: missions.filter((mission) => mission.is_archived),
  };
}

export async function createMission(input: unknown) {
  const payload = missionPayloadSchema.parse(input);
  await assertMissionIconKeyAvailable(payload.icon_key);

  const maxActive = await prisma.mission.aggregate({
    where: { is_archived: false },
    _max: { sort_order: true },
  });

  const mission = await prisma.mission.create({
    data: {
      ...payload,
      sort_order: (maxActive._max.sort_order ?? -1) + 1,
      is_archived: false,
    },
  });

  return mission;
}

export async function updateMission(id: string, input: unknown) {
  const payload = missionPayloadSchema.parse(input);
  const existing = await prisma.mission.findUnique({
    where: { id },
    select: { id: true, icon_key: true },
  });
  if (!existing) {
    throw new Error('Mission not found');
  }

  // Preserve editability for legacy records that may already collide, but block
  // assigning a taken icon when the user changes the icon.
  if (payload.icon_key !== existing.icon_key) {
    await assertMissionIconKeyAvailable(payload.icon_key, id);
  }

  return prisma.mission.update({
    where: { id },
    data: payload,
  });
}

export async function archiveMission(id: string) {
  return prisma.mission.update({
    where: { id },
    data: { is_archived: true },
  });
}

export async function restoreMission(id: string) {
  const maxActive = await prisma.mission.aggregate({
    where: { is_archived: false },
    _max: { sort_order: true },
  });

  return prisma.mission.update({
    where: { id },
    data: {
      is_archived: false,
      sort_order: (maxActive._max.sort_order ?? -1) + 1,
    },
  });
}

export async function reorderActiveMissions(orderedIds: string[]) {
  const activeMissions = await prisma.mission.findMany({ where: { is_archived: false }, select: { id: true } });
  const activeIds = activeMissions.map((mission) => mission.id);

  if (orderedIds.length !== activeIds.length) {
    throw new Error('Ordered mission list length mismatch');
  }

  const orderedSet = new Set(orderedIds);
  if (orderedSet.size !== orderedIds.length || activeIds.some((id) => !orderedSet.has(id))) {
    throw new Error('Ordered mission list does not match active missions');
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.mission.update({
        where: { id },
        data: { sort_order: index },
      }),
    ),
  );

  return getMissions();
}
