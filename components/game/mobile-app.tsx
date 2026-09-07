'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {
  Home,
  Swords,
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
import { OnlinePanel, onlineRequest, queueOnlineReward } from './online-panel';
import type { OnlineView } from '@/lib/online/types';
import { MobileRun, type RunConfig } from './mobile-run';
import { PARTS, BATTLE_SLOTS } from '@/lib/game/catalog';
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
import {
  makeVaultTraps,
  defenderParts,
  VAULT_SLOTS,
} from '@/lib/game/vault-layout';
import {
  challengeCode,
  decodeChallenge,
  type VerifiedCourse,
} from '@/lib/game/route-proof';
import coursesData from '@/lib/game/data/verified-courses.json';
import { choosePracticeCourse } from '@/lib/game/practice-selection';
import storyData from '@/lib/game/data/story-courses.json';
import {
  STORY_LENGTH,
  storyUnlocked,
  completeStory,
} from '@/lib/game/story-progress';
import { MobileVaultEditor } from './mobile-vault-editor';
import { validFreeTraps, snapTrap } from '@/lib/game/free-vault';
import { reachSettings } from '@/lib/game/trap-reach';
import type { Trap } from '@/lib/game/physics';
import { StoryMap } from './story-map';
import { STORY_INTRO_KEY } from '@/lib/game/story-narrative';
const StoryIntro = dynamic(() =>
  import('./story-intro').then((m) => m.StoryIntro),
);
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
const storyCourses = storyData as (VerifiedCourse & {
  number: number;
  chapter: number;
})[];
const layoutExamples = [
  ...new Map(courses.map((c) => [c.level.layoutId ?? c.level.id, c])).values(),
];
export default function MobileApp() {
  const [profile, setProfile] = useState<MobileProfile>(newProfile),
    [ready, setReady] = useState(false),
    [screen, setScreen] = useState<
      'home' | 'vault' | 'shop' | 'axie' | 'online'
    >('home'),
    [run, setRun] = useState<RunConfig | null>(null),
    [notice, setNotice] = useState(''),
    [library, setLibrary] = useState(false),
    [inspect, setInspect] = useState<string | null>(null),
    [shared, setShared] = useState<VerifiedCourse | null>(null),
    [shareUrl, setShareUrl] = useState(''),
    [roomsOpen, setRoomsOpen] = useState(false),
    [storyOpen, setStoryOpen] = useState(false),
    [intro, setIntro] = useState<{ nextLevel: number | null } | null>(null),
    [activeDefender, setActiveDefender] = useState<0 | 1>(0),
    [guestAxie] = useState(() => randomAxie());
  const profileRef = useRef(profile),
    lastLayout = useRef<string | null>(null),
    introSeen = useRef(false);
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
      try {
        introSeen.current = localStorage.getItem(STORY_INTRO_KEY) === 'seen';
      } catch {}
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
  function story(
    number = storyUnlocked(profileRef.current.story),
    skipIntro = false,
  ) {
    if (number < 1 || number > storyUnlocked(profileRef.current.story)) return;
    const course = storyCourses[number - 1];
    if (!course) return;
    setStoryOpen(false);
    if (!skipIntro && !introSeen.current) {
      setRun(null);
      setIntro({ nextLevel: number });
      return;
    }
    launch({
      ...course,
      mode: 'story',
      axie: null,
      storyNumber: number,
      previousBest: profileRef.current.story[number - 1] ?? 0,
    });
  }
  function finishIntro() {
    const next = intro?.nextLevel;
    introSeen.current = true;
    try {
      localStorage.setItem(STORY_INTRO_KEY, 'seen');
    } catch {}
    setIntro(null);
    if (next != null) story(next, true);
    else setStoryOpen(true);
  }
  function attack(match: NonNullable<OnlineView['match']>) {
    launch({
      level: match.level,
      mode: 'online',
      axie: profile.axie,
      onlineId: match.id,
      onlineLimit: match.limit,
      opponent: match.opponent,
      onlineKind: match.kind,
    });
  }
  function exit() {
    if (run?.mode === 'online') {
      void onlineRequest({ action: 'abandon', matchId: run.onlineId! }).catch(
        () => {},
      );
      setScreen('online');
    }
    setRun(null);
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
  }
  function loadAxie(axie: Loadout | null) {
    if (!allowedParts(axie).length) {
      setNotice(
        'Este Axie no tiene cartas compatibles con el catálogo Classic actual.',
      );
      return;
    }
    const p = profileRef.current;
    const next = { ...p, [activeDefender === 0 ? 'axie' : 'companion']: axie };
    next.traps = makeVaultTraps(p.traps, p.guardianCount, [
      next.axie,
      next.companion,
    ]);
    next.traps = next.traps.map((t) => {
      const old = p.traps.find((o) => o.anchor === t.anchor);
      return {
        ...t,
        ...snapTrap(old?.x ?? t.x, old?.y ?? t.y),
        reach: old?.part === t.part ? old.reach : reachSettings(t.part).default,
      };
    });
    next.proof = null;
    save(next);
    setShareUrl('');
    setNotice(
      'Guardián ' +
        (activeDefender + 1) +
        ' actualizado. Valida de nuevo su defensa.',
    );
  }
  function replaceTraps(traps: Trap[]) {
    if (!validFreeTraps(traps)) return;
    save({
      ...profileRef.current,
      freePlacement: true,
      guardianCount: 1,
      traps,
      proof: null,
    });
    setShareUrl('');
  }
  function addTrap(anchor: number) {
    const p = profileRef.current,
      part = defenderParts(
        p.axie,
        anchor,
        p.traps.map((t) => t.part),
      )[0];
    if (!part) return;
    const base = VAULT_SLOTS[anchor];
    for (const y of [base.y, 3.9, 6.55, 9.2, 11.85, 14.5, 17.15, 19.8])
      for (const x of [base.x, 3, 6, 9]) {
        const traps = [
          ...p.traps,
          {
            ...base,
            ...snapTrap(x, y),
            anchor,
            part,
            reach: reachSettings(part).default,
          },
        ].sort((a, b) => a.anchor! - b.anchor!);
        if (validFreeTraps(traps)) {
          replaceTraps(traps);
          return;
        }
      }
    setNotice(
      'No hay espacio libre para esa defensa. Mueve otra trampa primero.',
    );
  }
  function editTrap(
    index: number,
    change: { part?: string; x?: number; y?: number; reach?: number },
  ) {
    const p = profileRef.current;
    const trap = p.traps[index],
      anchor = trap.anchor!,
      axie = anchor < 4 ? p.axie : p.companion;
    if (
      change.part &&
      !defenderParts(
        axie,
        anchor,
        p.traps.filter((_, i) => i !== index).map((t) => t.part),
      ).includes(change.part)
    )
      return;
    replaceTraps(
      p.traps.map((t, i) =>
        i === index
          ? {
              ...t,
              ...change,
              ...(change.part
                ? { reach: reachSettings(change.part).default }
                : {}),
            }
          : t,
      ),
    );
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
  if (intro)
    return (
      <StoryIntro
        replay={intro.nextLevel === null}
        onFinish={finishIntro}
        onClose={() => {
          setIntro(null);
          if (intro.nextLevel === null) setStoryOpen(true);
        }}
      />
    );
  if (run)
    return (
      <MobileRun
        key={run.id}
        run={run}
        onExit={exit}
        onNext={() =>
          run.mode === 'story'
            ? run.storyNumber! < STORY_LENGTH
              ? story(run.storyNumber! + 1)
              : exit()
            : practice()
        }
        onClaim={(id, hp, replay) => {
          if (
            !save(
              run.mode === 'story'
                ? completeStory(profileRef.current, run.storyNumber!, hp)
                : claimChispas(profileRef.current, id, hp),
            )
          )
            throw Error('No se pudo guardar el premio.');
          if (run.mode === 'story' || run.mode === 'practice')
            queueOnlineReward(run.level.id, run.mode, replay);
        }}
        onOnline={async (replay) => {
          const next = await onlineRequest({
            action: 'finish',
            matchId: run.onlineId!,
            replay,
          });
          const result = next.history?.find((m) => m.id === run.onlineId);
          if (result?.status === 'expired')
            throw Error('El ataque venció; no se transfirieron Chispas.');
          return result?.amount ?? 0;
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
                onClick={() =>
                  profile.story.length === STORY_LENGTH
                    ? setStoryOpen(true)
                    : story()
                }
                disabled={!ready}
              >
                <Play size={22} fill="currentColor" />
                <span>
                  {profile.story.length === STORY_LENGTH
                    ? 'Historia completada'
                    : profile.story.length
                      ? 'Continuar historia'
                      : 'Comenzar historia'}
                  <small>Un jugador · Axie aleatorio</small>
                </span>
                <span className="home-mode-count">
                  {storyUnlocked(profile.story)} / {STORY_LENGTH}
                </span>
              </button>
              <button
                className="home-challenge"
                onClick={() => setScreen('online')}
                disabled={!ready}
              >
                <Swords size={18} />
                <span>Online · Atacar refugios</span>
                <ChevronRight size={16} />
              </button>
              <div className="home-shortcuts">
                <button onClick={() => setRoomsOpen(true)} disabled={!ready}>
                  <BookOpen size={17} /> Práctica
                </button>
                <button onClick={() => setStoryOpen(true)} disabled={!ready}>
                  <BookOpen size={17} /> Capítulos
                </button>
              </div>
            </section>
          </>
        ) : null}
        {screen === 'online' ? (
          <OnlinePanel
            profile={profile}
            onEdit={() => setScreen('vault')}
            onAttack={attack}
          />
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
              Cada guardián aporta hasta cuatro partes diferentes. Para que
              otros la ataquen, tú debes llegar al cofre sin recibir un solo
              golpe.
            </p>
            <p className="story-free">
              Individual · Un Axie · Hasta cuatro trampas
            </p>
            <MobileVaultEditor traps={profile.traps} onChange={replaceTraps} />
            <button className="m-secondary" onClick={() => setScreen('axie')}>
              Elegir Axie guardián <ChevronRight size={16} />
            </button>
            <button className="m-secondary" onClick={() => setScreen('online')}>
              <Swords size={16} /> Cofre y modo online
            </button>
            <div className="guardian-switch">
              {BATTLE_SLOTS.map((slot, anchor) =>
                profile.traps.some((t) => t.anchor === anchor) ? null : (
                  <button key={slot} onClick={() => addTrap(anchor)}>
                    +{' '}
                    {
                      {
                        mouth: 'Boca',
                        horn: 'Cuerno',
                        back: 'Espalda',
                        tail: 'Cola',
                      }[slot]
                    }
                  </button>
                ),
              )}
            </div>
            <div className="vault-slots">
              {profile.traps.map((t, i) => (
                <section className="vault-slot" key={i}>
                  <div className="slot-number">
                    {i + 1}
                    <button
                      className="m-text"
                      disabled={profile.traps.length <= 1}
                      aria-label={'Quitar ' + PARTS[t.part].name}
                      onClick={() =>
                        replaceTraps(profile.traps.filter((_, j) => j !== i))
                      }
                    >
                      ×
                    </button>
                  </div>
                  <Image
                    unoptimized
                    src={PARTS[t.part].partImage}
                    width={51}
                    height={64}
                    alt=""
                  />
                  <div className="slot-settings">
                    <label htmlFor={'trap-' + i}>
                      Guardián {Math.floor(t.anchor! / 4) + 1} ·{' '}
                      {PARTS[t.part].slot}
                    </label>
                    <select
                      id={'trap-' + i}
                      value={t.part}
                      onChange={(e) => editTrap(i, { part: e.target.value })}
                    >
                      {defenderParts(
                        t.anchor! < 4 ? profile.axie : profile.companion,
                        t.anchor!,
                        profile.traps
                          .filter((_, j) => j !== i)
                          .map((t) => t.part),
                      ).map((id) => (
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
                      min={1.7}
                      max={10.3}
                      step="0.1"
                      value={t.x}
                      onChange={(e) =>
                        editTrap(i, snapTrap(Number(e.target.value), t.y))
                      }
                    />
                    <label className="range-label" htmlFor={'reach-' + i}>
                      {reachSettings(t.part).label}{' '}
                      <span>
                        {(t.reach ?? reachSettings(t.part).default).toFixed(1)}{' '}
                        m
                      </span>
                    </label>
                    <input
                      id={'reach-' + i}
                      type="range"
                      min={reachSettings(t.part).min}
                      max={reachSettings(t.part).max}
                      step="0.05"
                      disabled={reachSettings(t.part).kind === 'fixed'}
                      value={t.reach ?? reachSettings(t.part).default}
                      onChange={(e) =>
                        editTrap(i, { reach: Number(e.target.value) })
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
            {profile.guardianCount === 2 ? (
              <div className="guardian-switch">
                <button
                  onClick={() => setActiveDefender(0)}
                  className={activeDefender === 0 ? 'selected' : ''}
                >
                  Guardián 1
                </button>
                <button
                  onClick={() => setActiveDefender(1)}
                  className={activeDefender === 1 ? 'selected' : ''}
                >
                  Guardián 2
                </button>
              </div>
            ) : null}
            <AxieLoadout
              key={activeDefender}
              axie={activeDefender === 0 ? profile.axie : profile.companion}
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
          <DialogTitle>Práctica libre</DialogTitle>
          <DialogDescription>
            {layoutExamples.length} mapas · {courses.length} combinaciones
            verificadas · No avanza la historia
          </DialogDescription>
          <button
            className="m-primary"
            onClick={() => practice()}
            disabled={!ready}
          >
            <Play size={17} /> Sala aleatoria
          </button>
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
      <Dialog open={storyOpen} onOpenChange={setStoryOpen}>
        <DialogContent className="story-dialog">
          <DialogTitle>Historia de Lunacia</DialogTitle>
          <DialogDescription>50 niveles. Un cofre a la vez.</DialogDescription>
          <button
            className="m-secondary"
            onClick={() => {
              setStoryOpen(false);
              setIntro({ nextLevel: null });
            }}
          >
            <BookOpen size={17} /> Ver prólogo · La guerra de los cofres
          </button>
          <StoryMap best={profile.story} onPlay={story} />
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
