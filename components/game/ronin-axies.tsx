'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Wallet, Mail, LoaderCircle } from 'lucide-react';
import {
  RONIN_CHAIN,
  listWalletAxies,
  readAxieOnChain,
} from '@/lib/game/ronin';
import {
  createWaypointProvider,
  WAYPOINT_ENABLED,
  type WalletProvider,
} from '@/lib/game/waypoint';
import type { AxieLoadout } from '@/lib/game/axie';
export function RoninAxies({
  onLoad,
}: {
  onLoad: (axie: AxieLoadout) => void;
}) {
  const [account, setAccount] = useState(''),
    [ids, setIds] = useState<string[]>([]),
    [total, setTotal] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [provider, setProvider] = useState<WalletProvider | null>(null),
    epoch = useRef(0);
  const cancelPending = useCallback(() => {
    epoch.current++;
  }, []);
  useEffect(() => {
    if (!provider) return;
    const reset = () => {
      epoch.current++;
      setAccount('');
      setIds([]);
      setTotal(0);
      setBusy(false);
      setError(
        'La cuenta o red cambió. Vuelve a conectar para consultar tus Axies.',
      );
    };
    provider.on?.('accountsChanged', reset);
    provider.on?.('chainChanged', reset);
    provider.on?.('disconnect', reset);
    return () => {
      cancelPending();
      provider.removeListener?.('accountsChanged', reset);
      provider.removeListener?.('chainChanged', reset);
      provider.removeListener?.('disconnect', reset);
    };
  }, [provider, cancelPending]);
  useEffect(() => cancelPending, [cancelPending]);
  // Ronin Wallet enforces the network in the extension; Waypoint is pinned to
  // Ronin mainnet at creation, so it skips the pre-connect chain check.
  async function connectWith(p: WalletProvider, checkChain: boolean) {
    const current = ++epoch.current;
    setBusy(true);
    setError('');
    try {
      if (checkChain) {
        const chain = await p.request({ method: 'eth_chainId' });
        if (chain !== RONIN_CHAIN)
          throw new Error(
            'Selecciona Ronin Mainnet en tu billetera y vuelve a conectar.',
          );
      }
      const accounts = await p.request({ method: 'eth_requestAccounts' });
      if (
        !Array.isArray(accounts) ||
        typeof accounts[0] !== 'string' ||
        !/^0x[0-9a-f]{40}$/i.test(accounts[0])
      )
        throw new Error('La cuenta no compartió una dirección.');
      const address = accounts[0].toLowerCase();
      const page = await listWalletAxies(address, (args) => p.request(args));
      if (current !== epoch.current) return;
      setProvider(p);
      setAccount(address);
      setIds(page.ids);
      setTotal(page.total);
    } catch (e) {
      if (current === epoch.current)
        setError(
          (e as { code?: number }).code === 4001
            ? 'Conexión cancelada.'
            : e instanceof Error
              ? e.message
              : 'No se pudo conectar.',
        );
    } finally {
      if (current === epoch.current) setBusy(false);
    }
  }
  function connectRonin() {
    setError('');
    const p = (window as unknown as { ronin?: { provider?: WalletProvider } })
      .ronin?.provider;
    if (!p) {
      setError(
        'Abre el juego en un navegador con Ronin Wallet o en el navegador de su aplicación móvil.',
      );
      return;
    }
    void connectWith(p, true);
  }
  async function connectWaypoint() {
    setError('');
    setBusy(true);
    try {
      const p = await createWaypointProvider();
      await connectWith(p, false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo iniciar sesión con Sky Mavis.',
      );
      setBusy(false);
    }
  }
  // Reload the connected account's Axies without prompting a fresh login.
  async function refresh() {
    if (!provider || !account) return;
    const current = ++epoch.current;
    setBusy(true);
    setError('');
    try {
      const page = await listWalletAxies(account, (args) =>
        provider.request(args),
      );
      if (current === epoch.current) {
        setIds(page.ids);
        setTotal(page.total);
      }
    } catch (e) {
      if (current === epoch.current)
        setError(
          e instanceof Error ? e.message : 'No se pudieron cargar tus Axies.',
        );
    } finally {
      if (current === epoch.current) setBusy(false);
    }
  }
  async function more() {
    if (!provider || !account) return;
    const current = ++epoch.current;
    setBusy(true);
    setError('');
    try {
      const page = await listWalletAxies(
        account,
        (args) => provider.request(args),
        ids.length,
      );
      if (current === epoch.current) {
        setIds((old) => [...new Set([...old, ...page.ids])]);
        setTotal(page.total);
      }
    } catch (e) {
      if (current === epoch.current)
        setError(
          e instanceof Error ? e.message : 'No se pudieron cargar más Axies.',
        );
    } finally {
      if (current === epoch.current) setBusy(false);
    }
  }
  async function choose(id: string) {
    if (!provider) return;
    const current = ++epoch.current;
    setBusy(true);
    setError('');
    try {
      const chain = await provider.request({ method: 'eth_chainId' });
      const accounts = await provider.request({ method: 'eth_accounts' });
      if (
        chain !== RONIN_CHAIN ||
        !Array.isArray(accounts) ||
        String(accounts[0]).toLowerCase() !== account
      )
        throw new Error('La cuenta cambió. Vuelve a conectar.');
      const axie = await readAxieOnChain(id, (args) => provider.request(args));
      if (axie.owner !== account)
        throw new Error(
          'Ese Axie ya no pertenece a la cuenta conectada. Actualiza la lista.',
        );
      if (current === epoch.current) onLoad(axie);
    } catch (e) {
      if (current === epoch.current)
        setError(
          e instanceof Error ? e.message : 'No se pudo cargar ese Axie.',
        );
    } finally {
      if (current === epoch.current) setBusy(false);
    }
  }
  function disconnect() {
    epoch.current++;
    provider?.disconnect?.();
    setAccount('');
    setIds([]);
    setTotal(0);
    setProvider(null);
    setBusy(false);
    setError('');
  }
  return (
    <div className="ronin-axies">
      {account ? (
        <>
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={() => void refresh()}
          >
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Wallet size={16} />
            )}{' '}
            Actualizar mis Axies
          </button>
          <p className="ronin-account">
            {account.slice(0, 6)}…{account.slice(-4)} · {total} Axies{' '}
            <button type="button" className="text-button" onClick={disconnect}>
              Desconectar
            </button>
          </p>
          <div className="ronin-axie-list">
            {ids.map((id) => (
              <button
                type="button"
                key={id}
                disabled={busy}
                onClick={() => void choose(id)}
              >
                Axie #{id}
              </button>
            ))}
          </div>
          {ids.length < total ? (
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => void more()}
            >
              Cargar más Axies
            </button>
          ) : null}
          {total === 0 ? <p>No hay Axies en esta cuenta.</p> : null}
        </>
      ) : (
        <>
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={connectRonin}
          >
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Wallet size={16} />
            )}{' '}
            Conectar Ronin Wallet
          </button>
          {WAYPOINT_ENABLED ? (
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => void connectWaypoint()}
            >
              {busy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Mail size={16} />
              )}{' '}
              Iniciar con cuenta Sky Mavis
            </button>
          ) : null}
        </>
      )}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <p className="loadout-footnote">
        Consulta de cuenta, propiedad y genes. Sin firmas ni transferencias de
        fondos.
      </p>
    </div>
  );
}
