'use client';
import { t as translateText } from '@/lib/i18n/translate';
import { useLocale } from '@/lib/i18n/use-locale';

import { useEffect, useState } from 'react';
import { stringToHex } from 'viem';
import {
  createWaypointProvider,
  WAYPOINT_ENABLED,
  type WalletProvider,
} from '@/lib/game/waypoint';
import { RONIN_CHAIN, RONIN_ADD_CHAIN } from '@/lib/game/ronin';
import { accountRequest, flushCloudSave } from '@/lib/online/cloud-client';
export function AccountAccess({
  onAuthenticated,
}: {
  onAuthenticated?: (value: boolean) => void;
}) {
  useLocale();
  const [wallet, setWallet] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let stopped = false;
    void accountRequest()
      .then((a) => {
        if (!stopped) {
          setWallet(a.wallet ?? '');
          onAuthenticated?.(!!a.wallet);
        }
      })
      .catch(() => {});
    return () => {
      stopped = true;
    };
  }, [onAuthenticated]);
  async function connect(waypoint: boolean) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await flushCloudSave();
      const provider: WalletProvider | undefined = waypoint
        ? await createWaypointProvider()
        : (window as unknown as { ronin?: { provider?: WalletProvider } }).ronin
            ?.provider;
      if (!provider)
        throw Error(
          'Abre Ronin Wallet en su navegador móvil o instala su extensión.',
        );
      if (!waypoint) {
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: RONIN_CHAIN }],
          });
        } catch (e) {
          if ((e as { code?: number }).code !== 4902) throw e;
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [RONIN_ADD_CHAIN],
          });
        }
      }
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      });
      if (!Array.isArray(accounts) || typeof accounts[0] !== 'string')
        throw Error('La billetera no compartió una dirección.');
      const address = accounts[0];
      const challenge = await accountRequest({ action: 'challenge', address });
      const signature = await provider.request({
        method: 'personal_sign',
        params: [stringToHex(challenge.message), address],
      });
      const previous = await accountRequest();
      const next = await accountRequest({ action: 'login', signature });
      if (previous.id && previous.id !== next.id) {
        const queued = localStorage.getItem('waxies.online-rewards.v1');
        if (queued)
          localStorage.setItem('waxies.reward-backup.' + previous.id, queued);
        localStorage.removeItem('waxies.online-rewards.v1');
      }
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo conectar.');
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError('');
    try {
      await flushCloudSave();
      await accountRequest({ action: 'logout' });
      // Keep the account-scoped backup; the next guest starts separately.
      const profile = localStorage.getItem('waxies.mobile.v1');
      if (profile)
        localStorage.setItem('waxies.profile-backup.' + wallet, profile);
      localStorage.removeItem('waxies.mobile.v1');
      localStorage.removeItem('waxies.online-rewards.v1');
      window.location.reload();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <section
      className="cloud-account"
      aria-label={translateText('Cuenta y progreso')}
    >
      {wallet ? (
        <>
          <p>
            {translateText('Cuenta protegida · ')}
            {translateText(wallet.slice(0, 6))}…
            {translateText(wallet.slice(-4))}
          </p>
          <p>
            {translateText(
              'Historia, Bazar y refugio se guardan en tu cuenta. El cofre conserva su saldo online.',
            )}
          </p>
          <button
            data-object="close"
            data-label={translateText('Salir')}
            disabled={busy}
            onClick={() => void logout()}
          >
            {translateText('Cerrar sesión')}
          </button>
        </>
      ) : (
        <>
          <p>{translateText('Guarda y recupera tu aventura con tu cuenta.')}</p>
          <div className="cloud-account-actions">
            <button
              data-object="ronin"
              data-label={translateText('Ronin')}
              disabled={busy}
              onClick={() => void connect(false)}
            >
              {translateText('Entrar con Ronin')}
            </button>
            {WAYPOINT_ENABLED ? (
              <button
                data-object="sky-mavis"
                data-label={translateText('Sky Mavis')}
                disabled={busy}
                onClick={() => void connect(true)}
              >
                {translateText('Entrar con Sky Mavis')}
              </button>
            ) : null}
          </div>
          <small>
            {translateText(
              'Firma de acceso, sin transferir fondos. Se conserva tu cuenta online actual al vincularla por primera vez.',
            )}
          </small>
        </>
      )}
      {busy ? (
        <output>{translateText('Guardando y conectando…')}</output>
      ) : null}
      {error ? <p role="alert">{translateText(error)}</p> : null}
    </section>
  );
}
