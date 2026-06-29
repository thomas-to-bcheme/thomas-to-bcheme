import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const saveSecret = process.env.SAVE_SECRET;
  if (!saveSecret) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  const token = request.headers.get('X-Save-Token');
  if (!token || token !== saveSecret) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  return NextResponse.json({ valid: true });
}
