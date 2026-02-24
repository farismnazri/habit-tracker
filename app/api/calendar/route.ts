import { NextRequest, NextResponse } from 'next/server';
import { getCalendarMonth } from '@/lib/habits';
import { formatMonthKey } from '@/lib/date';
import { jsonError } from '@/lib/http';

export async function GET(request: NextRequest) {
  try {
    const month = request.nextUrl.searchParams.get('month') ?? formatMonthKey(new Date().getFullYear(), new Date().getMonth());
    const data = await getCalendarMonth(month);
    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error);
  }
}
