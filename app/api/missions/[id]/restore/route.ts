import { NextRequest, NextResponse } from 'next/server';
import { getMissions, restoreMission } from '@/lib/habits';
import { jsonError } from '@/lib/http';

export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await restoreMission(id);
    const data = await getMissions();
    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error);
  }
}
