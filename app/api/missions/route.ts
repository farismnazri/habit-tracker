import { NextRequest, NextResponse } from 'next/server';
import { createMission, getMissions } from '@/lib/habits';
import { jsonError } from '@/lib/http';

export async function GET() {
  try {
    const data = await getMissions();
    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mission = await createMission(body);
    return NextResponse.json(mission, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
