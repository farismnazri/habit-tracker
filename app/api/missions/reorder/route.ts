import { NextRequest, NextResponse } from 'next/server';
import { reorderActiveMissions } from '@/lib/habits';
import { jsonError } from '@/lib/http';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { orderedIds?: string[] };
    const data = await reorderActiveMissions(body.orderedIds ?? []);
    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error);
  }
}
