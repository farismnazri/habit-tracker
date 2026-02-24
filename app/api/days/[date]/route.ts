import { NextRequest, NextResponse } from 'next/server';
import { getDayInspector, saveDaySelections } from '@/lib/habits';
import { jsonError } from '@/lib/http';

export async function GET(_: NextRequest, context: { params: Promise<{ date: string }> }) {
  try {
    const { date } = await context.params;
    const data = await getDayInspector(date);
    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ date: string }> }) {
  try {
    const { date } = await context.params;
    const body = (await request.json()) as { checkedMissionIds?: string[] };
    const data = await saveDaySelections(date, body.checkedMissionIds ?? []);
    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error);
  }
}
