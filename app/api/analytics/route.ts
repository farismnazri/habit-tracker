import { NextRequest, NextResponse } from 'next/server';
import { analyticsFilterSchema, getDashboardAnalytics } from '@/lib/analytics';
import { jsonError } from '@/lib/http';

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams;
    const rawTaskIds = [
      ...search.getAll('taskId'),
      ...search.getAll('taskIds').flatMap((value) =>
        value
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean),
      ),
    ];

    const parsed = analyticsFilterSchema.parse({
      from: search.get('from'),
      to: search.get('to'),
      groupBy: search.get('groupBy') ?? undefined,
      taskIds: rawTaskIds,
    });

    const data = await getDashboardAnalytics(parsed);
    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error);
  }
}
