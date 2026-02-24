import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function jsonError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: error.flatten() },
      { status: 400 },
    );
  }

  if (error instanceof Error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: false, error: 'Unknown error' }, { status: 500 });
}
