const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function formatDateKeyLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKeyLocal(dateKey: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function parseMonthKey(monthKey: string): { year: number; monthIndex: number } {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }

  const [year, month] = monthKey.split('-').map(Number);
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }

  return { year, monthIndex: month - 1 };
}

export function formatMonthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

export function shiftMonth(monthKey: string, delta: number): string {
  const { year, monthIndex } = parseMonthKey(monthKey);
  const shifted = new Date(year, monthIndex + delta, 1);
  return formatMonthKey(shifted.getFullYear(), shifted.getMonth());
}

export function getMonthMeta(monthKey: string) {
  const { year, monthIndex } = parseMonthKey(monthKey);
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);

  return {
    year,
    monthIndex,
    first,
    last,
    monthLabel: `${MONTH_NAMES[monthIndex]} ${year}`,
    startDateKey: formatDateKeyLocal(first),
    endDateKey: formatDateKeyLocal(last),
  };
}

export function getMonthGridDates(monthKey: string): (Date | null)[][] {
  const { year, monthIndex } = parseMonthKey(monthKey);
  const first = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();

  // Convert JS Sunday=0..Saturday=6 into Monday-first offset where Monday=0.
  const leadingBlanks = (first.getDay() + 6) % 7;
  const totalNeeded = leadingBlanks + lastDay;
  const totalCells = totalNeeded <= 35 ? 35 : 42;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < leadingBlanks; i += 1) cells.push(null);
  for (let day = 1; day <= lastDay; day += 1) cells.push(new Date(year, monthIndex, day));
  while (cells.length < totalCells) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function todayDateKeyLocal(): string {
  return formatDateKeyLocal(new Date());
}
