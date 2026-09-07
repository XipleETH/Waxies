'use client';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  Play,
  Pencil,
  Pause,
  RotateCcw,
  Check,
  LockKeyhole,
  Coins,
  Sparkles,
  Link2,
  ShoppingBag,
  Castle,
  Gem,
  Flame,
  X,
} from 'lucide-react';
import {
  vaultLevel,
  GOODS,
  buyGood,
  type MobileProfile,
} from '@/lib/game/mobile-profile';
import { AppNavigation, type AppScreen } from './app-navigation';
import {
  decorationPositionsFor,
  clampDecorationPosition,
  type DecorationPosition,
} from '@/lib/game/decoration-layout';
import { roomFor, type Trap, type Dungeon } from '@/lib/game/physics';
import type { Engine } from '@/lib/game/scene';
import { PARTS, BATTLE_SLOTS } from '@/lib/game/catalog';
import { makeVaultTraps } from '@/lib/game/vault-layout';
import { snapTrap, validFreeTraps } from '@/lib/game/free-vault';
import { dungeonRoofY } from '@/lib/game/dungeon-framing';
import { projectilePaths } from '@/lib/game/projectile-flight';
import { reachSettings } from '@/lib/game/trap-reach';
import { challengeCode, verifyRoute } from '@/lib/game/route-proof';
import { randomAxie } from '@/lib/game/random-axie';
import { onlineRequest } from './online-panel';
import type { OnlineView } from '@/lib/online/types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import styles from './live-vault.module.css';
export function LiveVault({
  profile,
  onSave,
  onExit,
  onNavigate,
  shopOpen,
  onShopChange,
}: {
  profile: MobileProfile;
  onSave: (p: MobileProfile) => boolean;
  onExit: () => void;
  onNavigate: (screen: AppScreen) => void;
  shopOpen: boolean;
  onShopChange: (open: boolean) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<Engine | null>(null),
    latest = useRef(profile),
    save = useRef(onSave),
    testLevel = useRef<Dungeon | null>(null),
    modeRef = useRef<'edit' | 'test' | 'failed' | 'won'>('edit');
  const [mode, setMode] = useState<'edit' | 'test' | 'failed' | 'won'>('edit'),
    [loaded, setLoaded] = useState(false),
    [paused, setPaused] = useState(false),
    [selected, setSelected] = useState<number | null>(null),
    [ghost, setGhost] = useState<Trap | null>(null),
    [projection, setProjection] = useState({ x: 0.5, y: 0.5, dx: 0, dy: 0 }),
    [message, setMessage] = useState(''),
    [fund, setFund] = useState(false),
    [view, setView] = useState<OnlineView | null>(null),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(''),
    [amount, setAmount] = useState('50'),
    [link, setLink] = useState(''),
    [preview, setPreview] = useState<MobileProfile | null>(null),
    [previewId, setPreviewId] = useState<string | null>(null),
    [decorGhost, setDecorGhost] = useState<DecorationPosition[] | null>(null);
  const decorDrag = useRef<{
    index: number;
    positions: DecorationPosition[];
    moved: boolean;
  } | null>(null);
  const displayed = preview ?? profile;
  const displayedLevel = vaultLevel(displayed);
  if (decorGhost) displayedLevel.decorationPositions = decorGhost;
  useEffect(() => {
    let stopped = false;
    void onlineRequest()
      .then((v) => {
        if (!stopped) {
          setView(v);
          if (v.player?.chest) setAmount(String(v.player.chest));
        }
      })
      .catch(() => {});
    return () => {
      stopped = true;
    };
  }, []);
  useEffect(() => {
    if (loaded)
      engine.current?.setAppearance({
        theme: displayed.theme,
        decoration: displayed.decoration,
        decorationPositions: decorGhost ?? displayed.decorationPositions,
      });
  }, [
    displayed.theme,
    displayed.decoration,
    displayed.decorationPositions,
    decorGhost,
    loaded,
  ]);
  const drag = useRef<{
    trap: Trap;
    reach: boolean;
    clientX: number;
    initialReach: number;
    direction: number;
    moved: boolean;
  } | null>(null);
  useEffect(() => {
    latest.current = profile;
    save.current = onSave;
  }, [profile, onSave]);
  function changeMode(next: typeof mode) {
    modeRef.current = next;
    setMode(next);
  }
  useEffect(() => {
    let stopped = false;
    void import('@/lib/game/scene')
      .then(({ createEngine }) => {
        if (stopped || !host.current) return;
        const game = createEngine(
          host.current,
          (s) => {
            if (stopped) return;
            const g = engine.current;
            if (g) {
              const a = g.project(0, 0),
                b = g.project(1, 1);
              setProjection((p) =>
                p.x === a.x &&
                p.y === a.y &&
                p.dx === b.x - a.x &&
                p.dy === b.y - a.y
                  ? p
                  : { x: a.x, y: a.y, dx: b.x - a.x, dy: b.y - a.y },
              );
            }
            if (modeRef.current !== 'test') return;
            setPaused(s.phase === 'paused');
            if (s.hits) {
              game.setEditing(true);
              modeRef.current = 'failed';
              setMode('failed');
            } else if (s.phase === 'won' && testLevel.current) {
              game.setEditing(true);
              const proof = game.getProof();
              if (
                verifyRoute(testLevel.current, proof) &&
                save.current({ ...latest.current, proof })
              ) {
                modeRef.current = 'won';
                setMode('won');
                setMessage('Validada');
              } else {
                modeRef.current = 'failed';
                setMode('failed');
                setMessage('No se pudo guardar');
              }
            }
          },
          async (error) => {
            if (stopped) return;
            if (error) {
              setMessage(error);
              return;
            }
            game.setEditing(true);
            game.setLevel(vaultLevel(latest.current));
            await game.setAxie(latest.current.axie ?? randomAxie());
            if (!stopped) setLoaded(true);
          },
        );
        engine.current = game;
      })
      .catch(() => {
        if (!stopped) setMessage('No se pudo cargar el juego');
      });
    return () => {
      stopped = true;
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    if (loaded && modeRef.current === 'edit')
      engine.current?.setLevel(vaultLevel(latest.current));
  }, [
    profile.traps,
    profile.axie,
    profile.guardianCount,
    profile.freePlacement,
    loaded,
  ]);
  const traps = profile.traps,
    defaults = makeVaultTraps(traps, 1, [profile.axie]),
    t = ghost ?? traps.find((t) => t.anchor === selected),
    rule = t ? reachSettings(t.part) : null;
  const project = (x: number, y: number) => ({
    x: projection.x + x * projection.dx,
    y: projection.y + y * projection.dy,
  });
  const pos = (x: number, y: number) => {
    const p = project(x, y);
    return { left: p.x * 100 + '%', top: p.y * 100 + '%' };
  };
  function commit(next: Trap[]) {
    if (!validFreeTraps(next)) {
      setMessage('Deja espacio libre');
      return;
    }
    setMessage('');
    setLink('');
    onSave({
      ...latest.current,
      traps: next,
      proof: null,
      freePlacement: true,
      guardianCount: 1,
    });
  }
  function startDrag(
    e: PointerEvent<HTMLButtonElement>,
    trap: Trap,
    reach = false,
  ) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(trap.anchor!);
    setMessage('');
    drag.current = {
      trap: { ...trap },
      reach,
      clientX: e.clientX,
      initialReach: trap.reach ?? reachSettings(trap.part).default,
      direction: trap.x > 6 ? -1 : 1,
      moved: false,
    };
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current,
      r = host.current?.getBoundingClientRect(),
      g = engine.current;
    if (!d || !r || !g) return;
    d.moved = true;
    const world = g.unproject(
      (e.clientX - r.left) / r.width,
      (e.clientY - r.top) / r.height,
    );
    if (d.reach) {
      const rr = reachSettings(d.trap.part),
        a = g.unproject(0, 0),
        b = g.unproject(1, 0);
      d.trap.reach =
        Math.round(
          Math.min(
            rr.max,
            Math.max(
              rr.min,
              d.initialReach +
                ((e.clientX - d.clientX) / r.width) * (b.x - a.x) * d.direction,
            ),
          ) * 10,
        ) / 10;
    } else Object.assign(d.trap, snapTrap(world.x, world.y));
    setGhost({ ...d.trap });
  }
  function end() {
    const d = drag.current;
    drag.current = null;
    setGhost(null);
    if (
      !d ||
      (!d.moved && latest.current.traps.some((t) => t.anchor === d.trap.anchor))
    )
      return;
    commit(
      [
        ...latest.current.traps.filter((t) => t.anchor !== d.trap.anchor),
        d.trap,
      ].sort((a, b) => a.anchor! - b.anchor!),
    );
  }
  function cancel() {
    drag.current = null;
    setGhost(null);
  }
  function edit() {
    engine.current?.setEditing(true);
    engine.current?.setLevel(vaultLevel(latest.current));
    changeMode('edit');
    setMessage('');
  }
  function test() {
    if (!loaded) return;
    setSelected(null);
    setMessage('');
    const level = vaultLevel(latest.current);
    testLevel.current = level;
    engine.current?.setLevel(level);
    engine.current?.setEditing(false);
    changeMode('test');
    engine.current?.start();
  }
  function navigate(screen: AppScreen) {
    setPreview(null);
    setPreviewId(null);
    setDecorGhost(null);
    if (screen === 'shop') {
      edit();
      onShopChange(!shopOpen);
    } else onNavigate(screen);
  }
  function previewGood(id: string) {
    setSelected(null);
    setMessage('');
    setDecorGhost(null);
    setPreviewId(id);
    const good = GOODS.find((g) => g.id === id),
      p = latest.current;
    setPreview(
      id === 'none'
        ? { ...p, decoration: 'none' }
        : good
          ? { ...p, [good.kind]: id }
          : null,
    );
  }
  function applyGood() {
    if (!previewId || !preview) return;
    try {
      const next =
        previewId === 'none'
          ? { ...latest.current, decoration: 'none' }
          : buyGood(latest.current, previewId);
      if (next.decoration === preview.decoration)
        next.decorationPositions = preview.decorationPositions;
      if (!onSave(next)) throw Error('No se pudo guardar');
      setPreview(null);
      setPreviewId(null);
      setMessage('Aplicado');
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  function startDecor(e: PointerEvent<HTMLButtonElement>, index: number) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(null);
    setMessage('');
    decorDrag.current = {
      index,
      positions: decorationPositionsFor(displayedLevel).map((p) => ({ ...p })),
      moved: false,
    };
  }
  function moveDecor(e: PointerEvent<HTMLButtonElement>) {
    const d = decorDrag.current,
      rect = host.current?.getBoundingClientRect(),
      g = engine.current;
    if (!d || !rect || !g) return;
    const position = g.unproject(
      (e.clientX - rect.left) / rect.width,
      (e.clientY - rect.top) / rect.height,
    );
    d.positions[d.index] = clampDecorationPosition(
      position.x,
      position.y,
      displayedLevel,
    );
    d.moved = true;
    setDecorGhost(d.positions.map((p) => ({ ...p })));
  }
  function endDecor() {
    const d = decorDrag.current;
    decorDrag.current = null;
    setDecorGhost(null);
    if (!d?.moved) return;
    if (preview) setPreview({ ...preview, decorationPositions: d.positions });
    else if (!onSave({ ...latest.current, decorationPositions: d.positions }))
      setMessage('No se pudo guardar');
  }
  function closeShop() {
    setPreview(null);
    setPreviewId(null);
    setDecorGhost(null);
    onShopChange(false);
  }
  async function saveVault() {
    if (busy || !latest.current.proof) return;
    setBusy(true);
    setMessage('');
    try {
      const current = await onlineRequest();
      setView(current);
      edit();
      if (!current.player?.chest) {
        setFund(true);
        return;
      }
      const p = latest.current;
      const next = await onlineRequest({
        action: 'activate',
        amount: current.player.chest,
        code: challengeCode({ level: vaultLevel(p), proof: p.proof! }),
      });
      setView(next);
      setMessage('Guardada');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function openFund() {
    setFund(true);
    setMessage('');
    try {
      const next = await onlineRequest();
      setView(next);
      if (next.player?.chest) setAmount(String(next.player.chest));
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  async function deposit() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      if (!view?.registered) {
        setView(await onlineRequest({ action: 'join', name }));
        return;
      }
      const p = latest.current;
      if (!p.proof) throw Error('Completa la prueba sin golpes');
      setView(
        await onlineRequest({
          action: 'activate',
          amount: Number(amount),
          code: challengeCode({ level: vaultLevel(p), proof: p.proof }),
        }),
      );
      setFund(false);
      edit();
      setMessage('Cofre activo');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    try {
      const p = latest.current;
      if (!p.proof) return;
      const url =
        location.origin +
        '/#reto=' +
        encodeURIComponent(
          challengeCode({ level: vaultLevel(p), proof: p.proof }),
        );
      setLink(url);
      await navigator.clipboard.writeText(url);
      setMessage('Enlace copiado');
    } catch {
      setMessage('Copia el enlace');
    }
  }
  const trajectories = t
    ? projectilePaths(vaultLevel(profile), t, t.x > 6 ? -1 : 1)
    : [];
  const room = roomFor(vaultLevel(profile)),
    roof = project(room.w / 2, dungeonRoofY(vaultLevel(profile)) + 1.2),
    a = t
      ? project(Math.max(room.left, t.x - (t.reach ?? rule!.default)), t.y)
      : null,
    b = t
      ? project(Math.min(room.right, t.x + (t.reach ?? rule!.default)), t.y)
      : null,
    center = t ? project(t.x, t.y) : null;

  return (
    <main className={styles.stage} aria-label="Refugio interactivo">
      <header className={styles.top}>
        <button onClick={onExit} aria-label="Volver">
          <ArrowLeft />
        </button>
        <span>
          {profile.proof ? <Check size={16} /> : <LockKeyhole size={16} />}{' '}
          {profile.proof ? 'Validada' : 'Borrador'}
        </span>
        {mode === 'test' ? (
          <button
            onClick={() => engine.current?.pause()}
            aria-label={paused ? 'Continuar' : 'Pausar'}
          >
            {paused ? <Play size={20} /> : <Pause size={20} />}
          </button>
        ) : (
          <button onClick={() => void openFund()} aria-label="Abrir cofre">
            <Coins size={20} />
            {view?.player?.chest ?? ''}
          </button>
        )}
      </header>
      <div
        className={styles.world}
        ref={host}
        onPointerDown={(e) => {
          if (mode === 'test' && e.target instanceof HTMLCanvasElement)
            engine.current?.jump();
        }}
      >
        {loaded && mode === 'edit' ? (
          <div className={styles.overlay}>
            <div
              className={styles.tray}
              style={{ top: roof.y * 100 + '%' }}
              aria-label="Cuatro poderes"
            >
              {BATTLE_SLOTS.map((slot, anchor) => {
                const card =
                  traps.find((t) => t.anchor === anchor) ??
                  defaults.find((t) => t.anchor === anchor)!;
                return (
                  <button
                    key={slot}
                    aria-label={'Colocar ' + PARTS[card.part].name}
                    aria-pressed={selected === anchor}
                    onClick={() => setSelected(anchor)}
                    onPointerDown={(e) => startDrag(e, card)}
                    onPointerMove={move}
                    onPointerUp={end}
                    onPointerCancel={cancel}
                  >
                    <Image
                      unoptimized
                      src={PARTS[card.part].partImage}
                      width={42}
                      height={42}
                      alt=""
                    />
                    <small>{PARTS[card.part].name}</small>
                    {traps.some((t) => t.anchor === anchor) ? (
                      <Check size={10} />
                    ) : null}
                  </button>
                );
              })}
            </div>
            {displayed.decoration !== 'none'
              ? decorationPositionsFor(displayedLevel).map((point, index) => (
                  <button
                    key={'decor-' + index}
                    className={styles.decorTarget}
                    style={pos(point.x, point.y)}
                    aria-label={`Mover adorno ${index + 1}`}
                    onPointerDown={(e) => startDecor(e, index)}
                    onPointerMove={moveDecor}
                    onPointerUp={endDecor}
                    onPointerCancel={() => {
                      decorDrag.current = null;
                      setDecorGhost(null);
                    }}
                    onKeyDown={(e) => {
                      if (
                        ![
                          'ArrowLeft',
                          'ArrowRight',
                          'ArrowUp',
                          'ArrowDown',
                        ].includes(e.key)
                      )
                        return;
                      e.preventDefault();
                      const positions = decorationPositionsFor(
                        displayedLevel,
                      ).map((p) => ({ ...p }));
                      positions[index] = clampDecorationPosition(
                        point.x +
                          (e.key === 'ArrowLeft'
                            ? -0.2
                            : e.key === 'ArrowRight'
                              ? 0.2
                              : 0),
                        point.y +
                          (e.key === 'ArrowUp'
                            ? 0.2
                            : e.key === 'ArrowDown'
                              ? -0.2
                              : 0),
                        displayedLevel,
                      );
                      if (preview)
                        setPreview({
                          ...preview,
                          decorationPositions: positions,
                        });
                      else
                        onSave({
                          ...latest.current,
                          decorationPositions: positions,
                        });
                    }}
                  />
                ))
              : null}
            {traps.map((trap) => (
              <button
                key={trap.anchor}
                className={`${styles.target} ${selected === trap.anchor ? styles.selected : ''}`}
                style={pos(trap.x, trap.y)}
                aria-label={'Mover ' + PARTS[trap.part].name}
                onClick={() => setSelected(trap.anchor!)}
                onPointerDown={(e) => startDrag(e, trap)}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={cancel}
                onKeyDown={(e) => {
                  if (
                    [
                      'ArrowLeft',
                      'ArrowRight',
                      'ArrowUp',
                      'ArrowDown',
                    ].includes(e.key)
                  ) {
                    e.preventDefault();
                    commit(
                      traps.map((v) =>
                        v.anchor === trap.anchor
                          ? {
                              ...v,
                              ...snapTrap(
                                v.x +
                                  (e.key === 'ArrowLeft'
                                    ? -0.2
                                    : e.key === 'ArrowRight'
                                      ? 0.2
                                      : 0),
                                v.y +
                                  (e.key === 'ArrowUp'
                                    ? 2.65
                                    : e.key === 'ArrowDown'
                                      ? -2.65
                                      : 0),
                              ),
                            }
                          : v,
                      ),
                    );
                  }
                }}
              />
            ))}
            {ghost ? (
              <div className={styles.ghost} style={pos(ghost.x, ghost.y)}>
                <Image
                  unoptimized
                  src={PARTS[ghost.part].partImage}
                  width={42}
                  height={42}
                  alt=""
                />
              </div>
            ) : null}
            {t && rule && center && a && b && rule.kind !== 'fixed' ? (
              <>
                <svg
                  className={styles.range}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {rule.kind === 'radius' ? (
                    <ellipse
                      cx={center.x * 100}
                      cy={center.y * 100}
                      rx={
                        Math.abs(projection.dx) *
                        (t.reach ?? rule.default) *
                        100
                      }
                      ry={
                        Math.abs(projection.dy) *
                        (t.reach ?? rule.default) *
                        100
                      }
                    />
                  ) : trajectories.length ? (
                    trajectories.map((points, i) => (
                      <path
                        key={i}
                        d={points
                          .map((point, j) => {
                            const p = project(point.x, point.y);
                            return (
                              (j ? 'L' : 'M') + p.x * 100 + ' ' + p.y * 100
                            );
                          })
                          .join(' ')}
                      />
                    ))
                  ) : (
                    <path d={`M${a.x * 100} ${a.y * 100}H${b.x * 100}`} />
                  )}
                </svg>
                <button
                  className={styles.handle}
                  style={pos(
                    Math.max(
                      room.left + 0.5,
                      Math.min(
                        room.right - 0.5,
                        t.x +
                          (t.x > 6 ? -1 : 1) *
                            Math.max(1.8, t.reach ?? rule.default),
                      ),
                    ),
                    t.y,
                  )}
                  aria-label="Ajustar alcance"
                  title={`${rule.label}: ${(t.reach ?? rule.default).toFixed(1)}`}
                  onKeyDown={(e) => {
                    if (
                      ![
                        'ArrowLeft',
                        'ArrowRight',
                        'ArrowUp',
                        'ArrowDown',
                      ].includes(e.key)
                    )
                      return;
                    e.preventDefault();
                    const delta =
                      e.key === 'ArrowRight' || e.key === 'ArrowUp'
                        ? 0.1
                        : -0.1;
                    const reach =
                      Math.round(
                        Math.max(
                          rule.min,
                          Math.min(rule.max, (t.reach ?? rule.default) + delta),
                        ) * 10,
                      ) / 10;
                    if (reach !== (t.reach ?? rule.default))
                      commit(
                        traps.map((v) =>
                          v.anchor === t.anchor ? { ...v, reach } : v,
                        ),
                      );
                  }}
                  onPointerDown={(e) => startDrag(e, t, true)}
                  onPointerMove={move}
                  onPointerUp={end}
                  onPointerCancel={cancel}
                >
                  <span>↔</span>
                  <small>{(t.reach ?? rule.default).toFixed(1)}</small>
                </button>
              </>
            ) : null}
            <button
              className={styles.chest}
              style={pos(
                vaultLevel(profile).chest.x,
                vaultLevel(profile).chest.y,
              )}
              onClick={() => void openFund()}
              aria-label="Cargar cofre"
            />
          </div>
        ) : null}
      </div>
      {!loaded ? <div className={styles.loading}>Cargando…</div> : null}
      {mode === 'failed' || mode === 'won' ? (
        <div className={styles.result}>
          <span>
            {mode === 'won' ? <Check /> : <RotateCcw />}
            {mode === 'won'
              ? 'Validada'
              : message === 'No se pudo guardar'
                ? 'Sin guardar'
                : 'Un golpe'}
          </span>
          <button onClick={edit}>
            <Pencil size={18} />
            Editar
          </button>
          <button onClick={mode === 'won' ? () => void openFund() : test}>
            {mode === 'won' ? <Coins size={18} /> : <Play size={18} />}{' '}
            {mode === 'won' ? 'Cofre' : 'Reintentar'}
          </button>
        </div>
      ) : null}
      {message && !fund ? (
        <output className={styles.message}>{message}</output>
      ) : null}
      {shopOpen ? (
        <aside className={styles.bazaar} aria-label="Bazar del refugio">
          <div className={styles.bazaarHeader}>
            <span>
              <ShoppingBag size={16} /> Bazar
            </span>
            <span>
              <Sparkles size={14} /> {profile.chispas}
            </span>
            <button onClick={closeShop} aria-label="Cerrar Bazar">
              <X size={16} />
            </button>
          </div>
          <div className={styles.goods}>
            {GOODS.map((g) => (
              <button
                key={g.id}
                disabled={!loaded}
                aria-label={'Previsualizar ' + g.name}
                aria-pressed={previewId === g.id}
                onClick={() => previewGood(g.id)}
                style={{ color: g.color }}
              >
                {g.kind === 'theme' ? (
                  <Castle size={24} />
                ) : g.id === 'crystals' ? (
                  <Gem size={24} />
                ) : (
                  <Flame size={24} />
                )}
                <small>
                  {
                    {
                      moss: 'Musgo',
                      amethyst: 'Amatista',
                      ember: 'Ámbar',
                      crystals: 'Cristales',
                      lanterns: 'Faroles',
                    }[g.id]
                  }
                </small>
                <small>
                  {profile.owned.includes(g.id) ? (
                    <Check size={12} />
                  ) : (
                    <>
                      <Sparkles size={9} /> {g.price}
                    </>
                  )}
                </small>
              </button>
            ))}
            <button
              aria-label="Previsualizar sin adornos"
              aria-pressed={previewId === 'none'}
              onClick={() => previewGood('none')}
            >
              <X size={24} />
              <small>Sin adornos</small>
            </button>
          </div>
          {previewId ? (
            <div className={styles.purchase}>
              <small>Vista previa</small>
              <button
                onClick={applyGood}
                disabled={
                  previewId !== 'none' &&
                  !profile.owned.includes(previewId) &&
                  profile.chispas <
                    (GOODS.find((g) => g.id === previewId)?.price ?? 0)
                }
              >
                {previewId === 'none' || profile.owned.includes(previewId) ? (
                  'Aplicar'
                ) : (
                  <>
                    Comprar · {GOODS.find((g) => g.id === previewId)?.price}{' '}
                    <Sparkles size={12} />
                  </>
                )}
              </button>
            </div>
          ) : null}
        </aside>
      ) : null}
      <AppNavigation
        active={shopOpen ? 'shop' : 'vault'}
        onNavigate={navigate}
        vaultAction={{
          label:
            mode === 'test' ? 'Editar' : profile.proof ? 'Guardar' : 'Probar',
          disabled: !loaded || busy,
          onClick: () => {
            if (shopOpen) closeShop();
            if (mode === 'test') edit();
            else if (profile.proof) void saveVault();
            else test();
          },
        }}
      />
      {link && mode === 'edit' ? (
        <input
          className={styles.link}
          aria-label="Enlace del reto"
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
        />
      ) : null}
      <Dialog open={fund} onOpenChange={setFund}>
        <DialogContent className={styles.fund}>
          <DialogTitle>Cofre</DialogTitle>
          <DialogDescription>
            {view?.registered
              ? `${view.player?.available ?? 0} disponibles · ${view.player?.chest ?? 0} guardadas`
              : '100 Chispas de prueba'}
          </DialogDescription>
          {message ? <output>{message}</output> : null}
          {profile.proof ? (
            <button onClick={() => void share()}>
              <Link2 size={16} /> Compartir
            </button>
          ) : null}
          {!view ? (
            <span>Conectando…</span>
          ) : !view.configured ? (
            <span>Sin conexión</span>
          ) : !view.registered ? (
            <>
              <input
                aria-label="Nombre online"
                placeholder="Nombre"
                value={name}
                maxLength={24}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                disabled={busy || name.trim().length < 2}
                onClick={() => void deposit()}
              >
                Crear
              </button>
            </>
          ) : (
            <>
              <input
                aria-label="Chispas"
                type="number"
                min={1}
                max={(view.player?.available ?? 0) + (view.player?.chest ?? 0)}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <button
                disabled={busy || !profile.proof || view.player?.locked}
                onClick={() => void deposit()}
              >
                {busy ? 'Guardando…' : 'Activar'}
              </button>
              {!profile.proof ? <small>Valida sin golpes</small> : null}
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
