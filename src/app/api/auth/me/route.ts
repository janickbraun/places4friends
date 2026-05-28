import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

function parseCookie(header: string | null, name: string) {
  if (!header) return null;
  const pairs = header.split(';').map(p => p.trim());
  for (const p of pairs) {
    const [k, ...rest] = p.split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const token = parseCookie(cookieHeader, 'token') ?? undefined;
    const user = await getUserFromToken(token);
    return NextResponse.json({ user: user ?? null });
  } catch (err) {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
