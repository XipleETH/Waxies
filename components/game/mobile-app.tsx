'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {
  Home,
  Castle,
  Sparkles,
  ShoppingBag,
  Play,
  ShieldCheck,
  LockKeyhole,
  Link2,
  BookOpen,
  ChevronRight,
  Check,
  Flame,
  Gem,
} from 'lucide-react';
import { AxiePreview } from './axie-preview';
import { randomAxie } from '@/lib/game/random-axie';
import { MobileRun, type RunConfig } from './mobile-run';
import { PARTS } from '@/lib/game/catalog';
import { raidPowerDescription } from '@/lib/game/raid-powers';
import { allowedParts, type AxieLoadout as Loadout } from '@/lib/game/axie';
import {
  PROFILE_KEY,
  GOODS,
  newProfile,
  readProfile,
  vaultLevel,
  buyGood,
  claimChispas,
  type MobileProfile,
} from '@/lib/game/mobile-profile';
import { PORTRAIT_SLOTS } from '@/lib/game/portrait';
import {
  challengeCode,
  decodeChallenge,
  type VerifiedCourse,
} from '@/lib/game/route-proof';
import coursesData from '@/lib/game/data/verified-courses.json';
import { choosePracticeCourse } from '@/lib/game/practice-selection';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
const AxieLoadout = dynamic(() =>
  import('./axie-loadout').then((m) => m.AxieLoadout),
);
const PartLibrary = dynamic(() =>
  import('./part-library').then((m) => m.PartLibrary),
);
const courses = coursesData as VerifiedCourse[];
const layoutExamples = [
  ...new Map(courses.map((c) => [c.level.layoutId ?? c.level.id, c])).values(),
];
export default function MobileApp() {
  const [profile, setProfile] = useState<MobileProfile>(newProfile),
    [ready, setReady] = useState(false),
    [screen, setScreen] = useState<'home' | 'vault' | 'shop' | 'axie'>('home'),
    [run, setRun] = useState<RunConfig | null>(null),
    [notice, setNotice] = useState(''),
    [library, setLibrary] = useState(false),
    [inspect, setInspect] = useState<string | null>(null),
    [shared, setShared] = useState<VerifiedCourse | null>(null),
    [shareUrl, setShareUrl] = useState(''),
    [roomsOpen, setRoomsOpen] = useState(false),
    [guestAxie] = useState(() => randomAxie());
  const profileRef = useRef(profile),
    lastLayout = useRef<string | null>(null);
  useEffect(() => {
    let stopped = false;
    queueMicrotask(() => {
      if (stopped) return;
      try {
        const p = readProfile();
        setProfile(p);
        profileRef.current = p;
      } catch (e) {
        setNotice(
          (e as Error).message +
            ' El archivo anterior se conserva hasta que guardes un cambio.',
        );
      }
      setReady(true);
      readLink();
    });
    function readLink() {
      if (location.hash.startsWith('#reto=')) {
        try {
          setShared(
            decodeChallenge(decodeURIComponent(location.hash.slice(6))),
          );
        } catch (e) {
          setNotice((e as Error).message);
        }
      }
    }
    window.addEventListener('hashchange', readLink);
    return () => {
      stopped = true;
      window.removeEventListener('hashchange', readLink);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 6500);
    return () => clearTimeout(timer);
  }, [notice]);
  function save(p: MobileProfile) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
      profileRef.current = p;
      setProfile(p);
      return true;
    } catch {
      setNotice(
        'No se pudo guardar. Revisa el espacio o los permisos de almacenamiento del navegador.',
      );
      return false;
    }
  }
  function launch(config: Omit<RunConfig, 'id'>) {
    if (!ready) return;
    setNotice('');
    setRun({ ...config, id: crypto.randomUUID() });
    if (!document.fullscreenElement)
      void document.documentElement.requestFullscreen?.().catch(() => {});
  }
  function practice(layoutId?: string) {
    const course = choosePracticeCourse(courses, lastLayout.current, layoutId);
    lastLayout.current = course.level.layoutId ?? course.level.id;
    setRoomsOpen(false);
    launch({ ...course, mode: 'practice', axie: null });
  }
  function exit() {
    setRun(null);
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
  }
  function loadAxie(axie: Loadout | null) {
    const parts = allowedParts(axie);
    if (!parts.length) {
      setNotice(
        'Este Axie no tiene cartas compatibles con el catálogo Classic actual.',
      );
      return;
    }
    const p = profileRef.current;
    save({
      ...p,
      axie,
      traps: p.traps.map((t, i) => ({
        ...t,
        part: parts.includes(t.part)
          ? t.part
          : (parts[i % parts.length] ?? 'carrot'),
      })),
      proof: null,
    });
    setShareUrl('');
    setNotice(
      axie
        ? 'Axie cargado. Tu defensa solo usa sus cartas disponibles.'
        : 'Laboratorio libre: todas las cartas disponibles.',
    );
  }
  function editTrap(index: number, change: { part?: string; x?: number }) {
    const p = profileRef.current;
    if (change.part && !allowedParts(p.axie).includes(change.part)) return;
    save({
      ...p,
      traps: p.traps.map((t, i) => (i === index ? { ...t, ...change } : t)),
      proof: null,
    });
    setShareUrl('');
  }
  async function share() {
    const p = profileRef.current;
    if (!p.proof) return;
    try {
      const url =
        location.origin +
        '/#reto=' +
        encodeURIComponent(
          challengeCode({ level: vaultLevel(p), proof: p.proof }),
        );
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setNotice('Enlace copiado. Tu amigo podrá atacar esta defensa.');
    } catch {
      setNotice('Puedes copiar el enlace que aparece debajo.');
    }
  }
  const available = allowedParts(profile.axie),
    part = inspect ? PARTS[inspect] : null;
  if (run)
    return (
      <MobileRun
        key={run.id}
        run={run}
        onExit={exit}
        onNext={() => practice()}
        onClaim={(id, hp) => {
          if (!save(claimChispas(profileRef.current, id, hp)))
            throw Error('No se pudo guardar el premio.');
        }}
        onValidate={(proof) => {
          if (save({ ...profileRef.current, proof })) {
            exit();
            setScreen('vault');
            setNotice('Defensa validada: ya puedes compartirla.');
          }
        }}
      />
    );
  return (
    <main className={screen === 'home' ? 'mobile-app is-home' : 'mobile-app'}>
      {screen === 'home' ? (
        <>
          <AxiePreview
            genes={profile.axie?.genes ?? guestAxie.genes}
            theme={profile.theme}
            decoration={profile.decoration}
            traps={profile.traps}
            validated={!!profile.proof}
          />
          <div className="home-shading" aria-hidden="true" />
        </>
      ) : null}
      <header className="m-header">
        <button
          onClick={() => setScreen('home')}
          className="m-brand"
          aria-label="WAXIS inicio"
        >
          <span className="brand-symbol">W</span>WAXIS
          <span className="brand-dot" />
        </button>
        <button
          className="m-balance"
          onClick={() => setScreen('shop')}
          aria-label={`${profile.chispas} Chispas. Abrir tienda`}
        >
          <Sparkles size={17} />
          {profile.chispas}
          <span>＋</span>
        </button>
      </header>
      <div className="m-content">
        {screen === 'home' ? (
          <>
            <section className="home-heading">
              <span className="m-eyebrow">TU RINCÓN DE LUNACIA</span>
              <h1>Tu refugio.</h1>
              <button
                className="home-refuge-state"
                onClick={() => setScreen('vault')}
              >
                <span>{GOODS.find((g) => g.id === profile.theme)?.name}</span>
                <i />
                {profile.proof ? (
                  <>
                    <ShieldCheck size={13} /> Validado
                  </>
                ) : (
                  <>
                    Borrador <ChevronRight size={13} />
                  </>
                )}
              </button>
            </section>
            <button
              className="home-companion"
              onClick={() => setScreen('axie')}
            >
              <Sparkles size={14} />
              {profile.axie ? 'Axie #' + profile.axie.id : 'Conoce a tu Axie'}
              <ChevronRight size={14} />
            </button>
            <section className="home-actions" aria-label="Jugar y personalizar">
              {shared ? (
                <button
                  className="home-challenge"
                  onClick={() =>
                    launch({ ...shared, mode: 'shared', axie: profile.axie })
                  }
                >
                  <Link2 size={16} />
                  <span>Un amigo te ha retado</span>
                  <ChevronRight size={16} />
                </button>
              ) : null}
              <button
                className="home-play"
                onClick={() => practice()}
                disabled={!ready}
              >
                <Play size={22} fill="currentColor" />
                <span>
                  Jugar<small>Práctica aleatoria</small>
                </span>
                <span className="home-mode-count">
                  {layoutExamples.length} salas
                </span>
              </button>
              <div className="home-shortcuts">
                <button onClick={() => setRoomsOpen(true)} disabled={!ready}>
                  <BookOpen size={17} /> Elegir sala
                </button>
                <button onClick={() => setScreen('vault')}>
                  <Castle size={17} /> Mi mazmorra
                </button>
              </div>
            </section>
          </>
        ) : null}
        {screen === 'vault' ? (
          <>
            <div className="m-heading">
              <div>
                <span className="m-eyebrow">TU MAZMORRA</span>
                <h1>Mi refugio</h1>
              </div>
              <span className={profile.proof ? 'm-status valid' : 'm-status'}>
                {profile.proof ? (
                  <ShieldCheck size={14} />
                ) : (
                  <LockKeyhole size={14} />
                )}{' '}
                {profile.proof ? 'Validada' : 'Borrador'}
              </span>
            </div>
            <p className="m-intro">
              Coloca tres defensas. Para que otros la ataquen, tú debes llegar
              al cofre sin recibir un solo golpe.
            </p>
            <div
              className="vault-editor-map"
              style={
                {
                  '--vault-color': GOODS.find((g) => g.id === profile.theme)
                    ?.color,
                } as React.CSSProperties
              }
            >
              <svg
                viewBox="0 0 120 220"
                aria-label="Plano vertical de tu mazmorra"
              >
                <rect
                  x="5"
                  y="2"
                  width="110"
                  height="216"
                  rx="7"
                  fill="var(--vault-color)"
                  opacity=".12"
                />
                {vaultLevel(profile).platforms.map((p, i) => (
                  <rect
                    key={i}
                    x={(p.x - p.w / 2) * 10}
                    y={220 - (p.y + p.h / 2) * 10}
                    width={p.w * 10}
                    height={p.h * 10}
                    rx="1"
                    fill="var(--vault-color)"
                  />
                ))}
                {profile.traps.map((t, i) => (
                  <g key={i}>
                    <circle
                      cx={t.x * 10}
                      cy={220 - t.y * 10}
                      r="7"
                      fill="#d6b769"
                    />
                    <text
                      x={t.x * 10}
                      y={223 - t.y * 10}
                      textAnchor="middle"
                      fontSize="8"
                      fontWeight="bold"
                      fill="#162b2a"
                    >
                      {i + 1}
                    </text>
                  </g>
                ))}
                <text x="80" y="20" fontSize="14">
                  ▣
                </text>
                <circle cx="22" cy="205" r="4" fill="#a4ead3" />
              </svg>
              <div>
                <span className="m-eyebrow">TORRE VERTICAL</span>
                <h2>{GOODS.find((g) => g.id === profile.theme)?.name}</h2>
                <p>
                  7 plataformas
                  <br />3 defensas
                  <br />
                  {profile.axie
                    ? 'Partes del Axie #' + profile.axie.id
                    : 'Laboratorio libre'}
                </p>
                <button className="m-text" onClick={() => setScreen('axie')}>
                  Cambiar Axie <ChevronRight size={15} />
                </button>
                <button className="m-text" onClick={() => setScreen('shop')}>
                  Personalizar <ChevronRight size={15} />
                </button>
              </div>
            </div>
            <div className="vault-slots">
              {profile.traps.map((t, i) => (
                <section className="vault-slot" key={i}>
                  <div className="slot-number">{i + 1}</div>
                  <Image
                    unoptimized
                    src={PARTS[t.part].partImage}
                    width={51}
                    height={64}
                    alt=""
                  />
                  <div className="slot-settings">
                    <label htmlFor={'trap-' + i}>Defensa {i + 1}</label>
                    <select
                      id={'trap-' + i}
                      value={t.part}
                      onChange={(e) => editTrap(i, { part: e.target.value })}
                    >
                      {available.map((id) => (
                        <option key={id} value={id}>
                          {PARTS[id].name} · {PARTS[id].short}
                        </option>
                      ))}
                    </select>
                    <label className="range-label" htmlFor={'position-' + i}>
                      Posición <span>{t.x.toFixed(1)}</span>
                    </label>
                    <input
                      id={'position-' + i}
                      type="range"
                      min={PORTRAIT_SLOTS[i].x - 1.5}
                      max={PORTRAIT_SLOTS[i].x + 1.5}
                      step="0.1"
                      value={t.x}
                      onChange={(e) =>
                        editTrap(i, { x: Number(e.target.value) })
                      }
                    />
                  </div>
                  <button
                    className="slot-info"
                    aria-label={'Cómo funciona ' + PARTS[t.part].name}
                    onClick={() => setInspect(t.part)}
                  >
                    i
                  </button>
                </section>
              ))}
            </div>
            <button
              className="m-primary"
              disabled={!ready || available.length === 0}
              onClick={() =>
                launch({
                  level: vaultLevel(profile),
                  mode: 'validate',
                  axie: profile.axie,
                })
              }
            >
              <Play size={18} />{' '}
              {profile.proof ? 'Jugar mi defensa' : 'Validar sin golpes'}
            </button>
            <button
              className="m-secondary"
              disabled={!profile.proof}
              onClick={() => void share()}
            >
              <Link2 size={18} /> Compartir defensa
            </button>
            {shareUrl ? (
              <label className="share-field">
                Enlace de tu reto
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                />
              </label>
            ) : null}
            <p className="m-footnote">
              Los cambios se guardan como borrador en este dispositivo. Cambiar
              una trampa invalida su prueba. Los retos se comparten por enlace;
              todavía no hay clasificación en línea.
            </p>
          </>
        ) : null}
        {screen === 'shop' ? (
          <>
            <div className="m-heading">
              <div>
                <span className="m-eyebrow">EL BAZAR DE LUNACIA</span>
                <h1>Hazlo tuyo.</h1>
              </div>
              <ShoppingBag size={28} />
            </div>
            <p className="m-intro">
              Tus victorias se convierten en estilo. Usa Chispas para decorar tu
              refugio.
            </p>
            <div className="shop-wallet">
              <Sparkles size={28} />
              <div>
                <span>TUS CHISPAS</span>
                <strong>{profile.chispas}</strong>
              </div>
              <small>
                {profile.wins} cofres
                <br />
                recogidos
              </small>
            </div>
            <div className="shop-grid">
              {GOODS.map((g) => {
                const owned = profile.owned.includes(g.id),
                  equipped =
                    profile.theme === g.id || profile.decoration === g.id;
                return (
                  <article className="shop-good" key={g.id}>
                    <div
                      className={'good-art ' + g.kind}
                      style={{ '--good-color': g.color } as React.CSSProperties}
                    >
                      {g.kind === 'theme' ? (
                        <Castle size={58} strokeWidth={1.2} />
                      ) : g.id === 'crystals' ? (
                        <Gem size={52} />
                      ) : (
                        <Flame size={52} />
                      )}
                      <span>{g.kind === 'theme' ? 'TEMA' : 'ADORNO'}</span>
                    </div>
                    <h2>{g.name}</h2>
                    <p>{g.description}</p>
                    <button
                      disabled={
                        !ready ||
                        equipped ||
                        (!owned && profile.chispas < g.price)
                      }
                      onClick={() => {
                        try {
                          if (save(buyGood(profileRef.current, g.id)))
                            setNotice(g.name + ' equipado en tu refugio.');
                        } catch (e) {
                          setNotice((e as Error).message);
                        }
                      }}
                    >
                      {equipped ? (
                        <>
                          <Check size={15} /> Equipado
                        </>
                      ) : owned ? (
                        'Equipar'
                      ) : (
                        <>
                          <Sparkles size={14} /> {g.price}
                        </>
                      )}
                    </button>
                  </article>
                );
              })}
            </div>
            <p className="m-footnote">
              Chispas es una moneda de juego local, sin valor monetario. Más
              adelante: compras de cosméticos con SLP, AXS, RON y USDC. No hay
              pagos ni canjes activos.
            </p>
          </>
        ) : null}
        {screen === 'axie' ? (
          <>
            <div className="m-heading">
              <div>
                <span className="m-eyebrow">TU COMPAÑERO</span>
                <h1>Partes con poder.</h1>
              </div>
              <BookOpen size={27} />
            </div>
            <p className="m-intro">
              Las partes de tu Axie forman su modelo y desbloquean las defensas
              de tu refugio. En práctica descubrirás combinaciones aleatorias.
            </p>
            <AxieLoadout
              axie={profile.axie}
              onLoad={loadAxie}
              onLab={() => loadAxie(null)}
              onBrowse={() => setLibrary(true)}
            />
            <button className="m-secondary" onClick={() => setLibrary(true)}>
              <BookOpen size={18} /> Explorar 132 cartas Classic
            </button>
          </>
        ) : null}
      </div>
      {notice ? (
        <output className="m-toast">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Cerrar aviso">
            ×
          </button>
        </output>
      ) : null}
      <nav className="m-nav" aria-label="Navegación principal">
        {(
          [
            { id: 'home', label: 'Jugar', Icon: Home },
            { id: 'vault', label: 'Refugio', Icon: Castle },
            { id: 'shop', label: 'Bazar', Icon: ShoppingBag },
            { id: 'axie', label: 'Mi Axie', Icon: Sparkles },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setScreen(id)}
            className={screen === id ? 'active' : ''}
            aria-current={screen === id ? 'page' : undefined}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <Dialog open={roomsOpen} onOpenChange={setRoomsOpen}>
        <DialogContent className="room-picker-dialog">
          <DialogTitle>Elige tu próxima sala</DialogTitle>
          <DialogDescription>
            {layoutExamples.length} mapas · {courses.length} combinaciones
            verificadas
          </DialogDescription>{' '}
          <div className="map-carousel" aria-label="Mapas de práctica">
            {layoutExamples.map(({ level }) => (
              <button
                className="map-choice"
                key={level.layoutId ?? level.id}
                onClick={() => practice(level.layoutId)}
                disabled={!ready}
              >
                <svg
                  viewBox={`0 0 ${level.room!.w} ${level.room!.h}`}
                  aria-label={`Plano de ${level.name}`}
                >
                  <rect
                    x="0.5"
                    y="0.5"
                    width={level.room!.w - 1}
                    height={level.room!.h - 1}
                    rx=".4"
                    fill={
                      level.theme === 'amethyst'
                        ? '#35344c'
                        : level.theme === 'ember'
                          ? '#49372b'
                          : '#25463e'
                    }
                  />
                  {level.platforms.map((p, i) => (
                    <rect
                      key={i}
                      x={p.x - p.w / 2}
                      y={level.room!.h - p.y - p.h / 2}
                      width={p.w}
                      height={p.h}
                      fill={
                        level.theme === 'amethyst'
                          ? '#a69aca'
                          : level.theme === 'ember'
                            ? '#ceac74'
                            : '#a3cdad'
                      }
                    />
                  ))}
                  <circle
                    cx={level.chest.x}
                    cy={level.room!.h - level.chest.y}
                    r=".5"
                    fill="#f1d178"
                  />
                  <circle
                    cx={level.spawn.x}
                    cy={level.room!.h - level.spawn.y}
                    r=".25"
                    fill="#c4eee0"
                  />
                </svg>
                <strong>{level.name}</strong>
                <span>{level.difficulty}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {library ? (
        <PartLibrary
          open={library}
          onOpenChange={setLibrary}
          available={available}
          onInspect={(id) => {
            setLibrary(false);
            setInspect(id);
          }}
        />
      ) : null}
      <Dialog
        open={!!part}
        onOpenChange={(open) => {
          if (!open) setInspect(null);
        }}
      >
        <DialogContent className="power-dialog">
          <DialogTitle>
            {part?.name} · {part?.card}
          </DialogTitle>
          <DialogDescription>
            La carta original y su adaptación a plataformas son reglas
            diferentes.
          </DialogDescription>
          {part ? (
            <>
              <Image
                unoptimized
                src={part.partImage}
                width={120}
                height={90}
                alt={part.name}
              />
              <h3>Axie Classic</h3>
              <p>{part.original}</p>
              <h3>En tu mazmorra</h3>
              <p>{raidPowerDescription(part.id)}</p>
              <p className="m-footnote">
                En este modo, cualquier contacto dañino reinicia el intento y
                resta 20 de salud. Los efectos de combate posteriores a un golpe
                no se acumulan. La defensa permanece visible entre ataques.
              </p>
              <a
                href="https://classic.axieinfinity.com/explorer/cards"
                target="_blank"
                rel="noreferrer"
              >
                Consultar carta oficial ↗
              </a>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
