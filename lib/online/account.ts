import { getAddress } from 'viem';
import { createLeaguePlayer } from './starter';
import type { OnlineState } from './types';
export interface LoginChallenge {
  address: string;
  message: string;
  expires: number;
  playerId?: string;
}
export function loginMessage(
  origin: string,
  address: string,
  nonce: string,
  now: number,
) {
  return (
    new URL(origin).host +
    ' wants you to sign in with your Ethereum account:\n' +
    getAddress(address) +
    '\n\nIniciar sesion en Axie Vault Riders. Sin transferencias de fondos.\n\nURI: ' +
    origin +
    '\nVersion: 1\nChain ID: 2020\nNonce: ' +
    nonce +
    '\nIssued At: ' +
    new Date(now).toISOString() +
    '\nExpiration Time: ' +
    new Date(now + 300000).toISOString()
  );
}
/** Called only after cryptographic verification; consumes the challenge in the same transaction. */
export function finishLogin(
  state: OnlineState,
  key: string,
  message: string,
  currentId: string | undefined,
  sessionHash: string,
  newId: string,
  now: number,
) {
  const challenge = state.loginChallenges?.[key];
  if (
    !challenge ||
    challenge.message !== message ||
    challenge.expires <= now ||
    challenge.playerId !== currentId
  )
    throw Error('El acceso caducó. Vuelve a conectar.');
  const address = challenge.address.toLowerCase();
  const existing = Object.values(state.players).find(
    (p) => p.wallet === address,
  );
  const current = currentId ? state.players[currentId] : undefined;
  if (current?.wallet && current.wallet !== address)
    throw Error('Cierra tu sesión antes de entrar con otra billetera.');
  const player =
    existing ??
    current ??
    createLeaguePlayer(
      state,
      newId,
      sessionHash,
      'Rider ' + address.slice(-6),
      now,
    );
  if (!existing && !current && Object.keys(state.players).length > 10000)
    throw Error('Esta beta alcanzó su capacidad de cuentas.');
  player.wallet = address;
  // On first linking revoke legacy guest sessions; wallet sessions have an expiry.
  player.secretHash = '';
  player.sessions = [
    ...(player.sessions ?? []).filter((s) => s.expires > now),
    { hash: sessionHash, expires: now + 30 * 86400000 },
  ].slice(-10);
  delete state.loginChallenges![key];
  return player;
}
