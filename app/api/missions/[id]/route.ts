import { NextRequest, NextResponse } from 'next/server';
import { updateMission } from '@/lib/habits';
import { jsonError } from '@/lib/http';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const mission = await updateMission(id, body);
    return NextResponse.json(mission);
  } catch (error) {
    return jsonError(error);
  }
}
