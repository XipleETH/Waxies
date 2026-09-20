import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import type { OnlineState } from './types';
export const SESSION_COOKIE = 'waxies_online_session';
export const hashSecret = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export function sessionPlayer(req: NextRequest, state: OnlineState) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return undefined;
  const hash = hashSecret(token);
  return Object.values(state.players).find(
    (p) =>
      p.secretHash === hash ||
      p.sessions?.some((s) => s.hash === hash && s.expires > Date.now()),
  )?.id;
}
export function sameOrigin(req: NextRequest) {
  return (
    req.headers.get('origin') ===
    req.nextUrl.protocol + '//' + req.headers.get('host')
  );
}
export function cookieOptions(req: NextRequest, maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: req.nextUrl.protocol === 'https:',
    path: '/',
    maxAge,
  };
}
