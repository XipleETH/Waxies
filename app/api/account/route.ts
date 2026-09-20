import { randomBytes, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  createPublicClient,
  http,
  isAddress,
  type Address,
  type Hex,
} from 'viem';
import { ronin } from 'viem/chains';
import { onlineConfigured, transact } from '@/lib/online/store';
import {
  SESSION_COOKIE,
  hashSecret,
  sessionPlayer,
  sameOrigin,
  cookieOptions,
} from '@/lib/online/session';
import { finishLogin, loginMessage } from '@/lib/online/account';
import { saveCloudProfile } from '@/lib/online/cloud-profile';
export const runtime = 'nodejs';
const CHALLENGE_COOKIE = 'waxies_login_challenge';
const reply = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(req: NextRequest) {
  if (!onlineConfigured()) return reply({ configured: false });
  try {
    return reply(
      await transact((s) => {
        const id = sessionPlayer(req, s),
          p = id ? s.players[id] : undefined;
        return {
          configured: true,
          id: p?.id,
          wallet: p?.wallet,
          cloud: p?.wallet ? p.cloud : undefined,
        };
      }),
    );
  } catch {
    return reply({ error: 'No se pudo recuperar la cuenta.' }, 503);
  }
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return reply({ error: 'Origen no permitido.' }, 403);
  if (!onlineConfigured())
    return reply({ error: 'El servidor online no está configurado.' }, 503);
  try {
    const text = await req.text();
    if (text.length > 220000)
      return reply({ error: 'Solicitud demasiado grande.' }, 413);
    const body = JSON.parse(text);
    if (body.action === 'challenge') {
      if (typeof body.address !== 'string' || !isAddress(body.address))
        return reply({ error: 'Dirección inválida.' }, 400);
      const token = randomBytes(32).toString('hex'),
        key = hashSecret(token),
        now = Date.now();
      const origin = req.nextUrl.protocol + '//' + req.headers.get('host');
      const message = loginMessage(origin, body.address, token, now);
      await transact((s) => {
        s.loginChallenges ??= {};
        for (const [k, c] of Object.entries(s.loginChallenges))
          if (c.expires <= now) delete s.loginChallenges[k];
        const previous = req.cookies.get(CHALLENGE_COOKIE)?.value;
        if (previous) delete s.loginChallenges[hashSecret(previous)];
        if (Object.keys(s.loginChallenges).length >= 1000)
          throw Error('Demasiados accesos. Reintenta en unos minutos.');
        s.loginChallenges[key] = {
          address: body.address.toLowerCase(),
          message,
          expires: now + 300000,
          playerId: sessionPlayer(req, s),
        };
      });
      const res = reply({ message });
      res.cookies.set(CHALLENGE_COOKIE, token, cookieOptions(req, 300));
      return res;
    }
    if (body.action === 'login') {
      const token = req.cookies.get(CHALLENGE_COOKIE)?.value;
      if (
        !token ||
        typeof body.signature !== 'string' ||
        !/^0x[0-9a-f]+$/i.test(body.signature) ||
        body.signature.length > 20000
      )
        return reply({ error: 'Firma inválida.' }, 400);
      const key = hashSecret(token);
      const challenge = await transact((s) => s.loginChallenges?.[key]);
      if (!challenge || challenge.expires <= Date.now())
        return reply({ error: 'El acceso caducó. Vuelve a conectar.' }, 400);
      const client = createPublicClient({
        chain: ronin,
        transport: http(
          process.env.RONIN_RPC_URL || ronin.rpcUrls.default.http[0],
          { timeout: 10000, retryCount: 1 },
        ),
      });
      const valid = await client.verifyMessage({
        address: challenge.address as Address,
        message: challenge.message,
        signature: body.signature as Hex,
      });
      if (!valid)
        return reply({ error: 'La firma no corresponde a esta cuenta.' }, 401);
      const session = randomBytes(32).toString('hex');
      const data = await transact((s) => {
        const p = finishLogin(
          s,
          key,
          challenge.message,
          sessionPlayer(req, s),
          hashSecret(session),
          randomUUID(),
          Date.now(),
        );
        return { id: p.id, wallet: p.wallet, cloud: p.cloud };
      });
      const res = reply(data);
      res.cookies.set(SESSION_COOKIE, session, cookieOptions(req, 30 * 86400));
      res.cookies.set(CHALLENGE_COOKIE, '', cookieOptions(req, 0));
      return res;
    }
    if (body.action === 'logout') {
      await transact((s) => {
        const id = sessionPlayer(req, s),
          token = req.cookies.get(SESSION_COOKIE)?.value;
        if (id && token) {
          const p = s.players[id],
            hash = hashSecret(token);
          p.sessions = p.sessions?.filter((t) => t.hash !== hash);
          if (p.secretHash === hash) p.secretHash = '';
        }
      });
      const res = reply({ ok: true });
      res.cookies.set(SESSION_COOKIE, '', cookieOptions(req, 0));
      return res;
    }
    if (body.action === 'save') {
      const data = await transact((s) => {
        const id = sessionPlayer(req, s),
          p = id ? s.players[id] : undefined;
        if (!p?.wallet || body.id !== p.id)
          return { status: 401, error: 'Vuelve a entrar con tu cuenta.' };
        if (!saveCloudProfile(p, body.revision, body.profile, Date.now()))
          return {
            status: 409,
            error:
              'Hay progreso más reciente en otro dispositivo. Recarga para recuperarlo.',
          };
        // Cosmetic/local save only: never credit available, chest or token balances from this snapshot.

        return { status: 200, revision: p.cloud!.revision };
      });
      return reply(data, data.status);
    }
    return reply({ error: 'Acción desconocida.' }, 400);
  } catch {
    return reply(
      {
        error:
          'No se pudo completar el acceso o guardado. Revisa la conexión y vuelve a intentarlo.',
      },
      400,
    );
  }
}
