import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { onlineConfigured, transact } from '@/lib/online/store';
import { applyOnline, onlineView, settle } from '@/lib/online/rules';
import type { OnlineCommand, OnlineState } from '@/lib/online/types';
export const runtime = 'nodejs';
const COOKIE = 'waxies_online_session';
const hash = (v: string) => createHash('sha256').update(v).digest('hex');
function identity(req: NextRequest, s: OnlineState) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return undefined;
  const h = hash(token);
  return Object.values(s.players).find((p) => p.secretHash === h)?.id;
}
function response(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
export async function GET(req: NextRequest) {
  if (!onlineConfigured())
    return response({ configured: false, registered: false });
  try {
    return response(
      await transact((s) => {
        const now = Date.now();
        settle(s, now);
        const id = identity(req, s);
        return id
          ? onlineView(s, id, now)
          : { configured: true, registered: false };
      }),
    );
  } catch {
    return response(
      { error: 'No se pudo conectar con el modo online. Inténtalo más tarde.' },
      503,
    );
  }
}
export async function POST(req: NextRequest) {
  if (req.headers.get('origin') !== req.nextUrl.origin)
    return response({ error: 'Origen no permitido.' }, 403);
  if (!onlineConfigured())
    return response(
      {
        error: 'El modo online está esperando la conexión de su base de datos.',
      },
      503,
    );
  let command: OnlineCommand | { action: 'join'; name: string };
  try {
    const text = await req.text();
    if (text.length > 220000)
      return response({ error: 'La repetición es demasiado larga.' }, 413);
    command = JSON.parse(text);
    if (
      !command ||
      typeof command !== 'object' ||
      typeof command.action !== 'string'
    )
      throw Error();
  } catch {
    return response({ error: 'Solicitud no válida.' }, 400);
  }
  const token = randomBytes(32).toString('hex');
  let created = false;
  try {
    const data = await transact((s) => {
      created = false;
      const now = Date.now();
      settle(s, now);
      let id = identity(req, s);
      if (command.action === 'join') {
        if (!id) {
          if (Object.keys(s.players).length >= 10000)
            throw new RuleError('Esta beta alcanzó su capacidad de cuentas.');
          const name =
            typeof command.name === 'string' ? command.name.trim() : '';
          if (name.length < 2 || name.length > 24)
            throw new RuleError('Escribe un nombre de 2 a 24 caracteres.');
          id = randomUUID();
          s.players[id] = {
            id,
            secretHash: hash(token),
            name,
            available: 100,
            chest: 0,
            active: false,
            created: now,
            rewards: {},
          };
          created = true;
        }
      } else {
        if (!id)
          throw new RuleError(
            'Primero crea tu cuenta online de este navegador.',
          );
        // Only game errors leave this boundary; database exceptions are handled outside it.
        try {
          applyOnline(s, id, command, now, randomUUID);
        } catch (e) {
          throw new RuleError((e as Error).message);
        }
      }
      return onlineView(s, id!, now);
    });
    const res = response(data);
    if (created)
      res.cookies.set(COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: req.nextUrl.protocol === 'https:',
        path: '/',
        maxAge: 365 * 24 * 60 * 60,
      });
    return res;
  } catch (e) {
    if (e instanceof RuleError) return response({ error: e.message }, 400);
    return response(
      {
        error:
          'No se pudo completar la operación online. Revisa tu sesión e inténtalo de nuevo.',
      },
      503,
    );
  }
}
class RuleError extends Error {}
