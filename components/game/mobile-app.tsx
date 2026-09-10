'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Swords, Sparkles, Play, Link2, Dumbbell } from 'lucide-react';
import { AppNavigation, type AppScreen } from './app-navigation';
import { AxiePreview } from './axie-preview';
import { randomAxie } from '@/lib/game/random-axie';
import { OnlinePanel, onlineRequest, queueOnlineReward } from './online-panel';
import type { OnlineView } from '@/lib/online/types';
import { MobileRun, type RunConfig } from './mobile-run';
import { PARTS } from '@/lib/game/catalog';
import { raidPowerDescription } from '@/lib/game/raid-powers';
import { allowedParts, type AxieLoadout as Loadout } from '@/lib/game/axie';
import {
  PROFILE_KEY,
  newProfile,
  readProfile,
  randomVaultParts,
  claimChispas,
  type MobileProfile,
} from '@/lib/game/mobile-profile';
import { makeVaultTraps } from '@/lib/game/vault-layout';
import { decodeChallenge, type VerifiedCourse } from '@/lib/game/route-proof';
import coursesData from '@/lib/game/data/verified-courses.json';
import { choosePracticeCourse } from '@/lib/game/practice-selection';
import storyData from '@/lib/game/data/story-courses.json';
import {
  STORY_LENGTH,
  storyUnlocked,
  completeStory,
} from '@/lib/game/story-progress';
const LiveVault = dynamic(() =>
  import('./live-vault').then((m) => m.LiveVault),
);
import { snapTrap } from '@/lib/game/free-vault';
import { reachSettings } from '@/lib/game/trap-reach';
import { StoryMap } from './story-map';
import { AxieRoom } from './axie-room';
import { ObjectMenu } from './object-menu';
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
    [screen, setScreen] = useState<AppScreen>('home'),
    [run, setRun] = useState<RunConfig | null>(null),
    [notice, setNotice] = useState(''),
    [library, setLibrary] = useState(false),
    [inspect, setInspect] = useState<string | null>(null),
    [shared, setShared] = useState<VerifiedCourse | null>(null),
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
        const existing = localStorage.getItem(PROFILE_KEY);
        const p = readProfile();
        // First-time guests get a unique free-mode vault, cached so it stays
        // theirs until a wallet Axie replaces its parts.
        if (!existing && !p.axie) {
          p.traps = randomVaultParts();
          try {
            localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
          } catch {}
        }
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
      axie: guestAxie,
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
    if (run?.mode === 'story') setStoryOpen(true);
    setRun(null);
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
    setNotice(
      'Guardián ' +
        (activeDefender + 1) +
        ' actualizado. Valida de nuevo su defensa.',
    );
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
  if ((screen === 'vault' || screen === 'shop') && !run)
    return (
      <LiveVault
        profile={profile}
        onSave={save}
        onNavigate={setScreen}
        shopOpen={screen === 'shop'}
        onShopChange={(open) => setScreen(open ? 'shop' : 'vault')}
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
    <main
      className={
        screen === 'home'
          ? 'mobile-app is-home'
          : screen === 'axie'
            ? 'mobile-app is-home is-axie-room'
            : 'mobile-app game-menu-room'
      }
    >
      {!storyOpen ? (
        <>
          <AxiePreview
            genes={
              (screen === 'axie' && activeDefender === 1
                ? profile.companion?.genes
                : profile.axie?.genes) ?? guestAxie.genes
            }
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
        <div className="m-account">
          <div className="m-balance" aria-label={`${profile.chispas} Chispas`}>
            <Sparkles size={17} aria-hidden="true" />
            {profile.chispas}
          </div>
          {(screen === 'home' || screen === 'axie') && (
            <button
              className="m-axie-shortcut"
              onClick={() => setScreen(screen === 'axie' ? 'home' : 'axie')}
              aria-label="Mi Axie"
              aria-current={screen === 'axie' ? 'page' : undefined}
            >
              <Sparkles size={24} aria-hidden="true" />
              <span>Mi Axie</span>
            </button>
          )}
        </div>
      </header>
      <div className="m-content">
        {screen === 'home' ? (
          <>
            <section className="home-actions" aria-label="Jugar y personalizar">
              <div className="home-mode-rail home-main-modes">
                <button
                  className="home-mode home-mode-story"
                  aria-label={`Historia ${storyUnlocked(profile.story)} de ${STORY_LENGTH}`}
                  onClick={() => setStoryOpen(true)}
                  disabled={!ready}
                >
                  <span className="home-mode-icon" aria-hidden="true">
                    <Play size={25} fill="currentColor" />
                    <span className="home-mode-count">
                      {storyUnlocked(profile.story)}/{STORY_LENGTH}
                    </span>
                  </span>
                  <span className="home-mode-label">Historia</span>
                </button>
                <button
                  className="home-mode home-mode-online"
                  aria-label="Online"
                  onClick={() => setScreen('online')}
                  disabled={!ready}
                >
                  <span className="home-mode-icon" aria-hidden="true">
                    <Swords size={26} />
                  </span>
                  <span className="home-mode-label">Online</span>
                </button>
                <button
                  className="home-mode"
                  aria-label="Práctica"
                  onClick={() => setRoomsOpen(true)}
                  disabled={!ready}
                >
                  <span className="home-mode-icon" aria-hidden="true">
                    <Dumbbell size={26} />
                  </span>
                  <span className="home-mode-label">Práctica</span>
                </button>
              </div>
              <div className="home-mode-rail">
                {shared ? (
                  <button
                    className="home-mode home-mode-shared"
                    aria-label="Reto"
                    onClick={() =>
                      launch({ ...shared, mode: 'shared', axie: profile.axie })
                    }
                  >
                    <span className="home-mode-icon" aria-hidden="true">
                      <Link2 size={26} />
                    </span>
                    <span className="home-mode-label">Reto</span>
                  </button>
                ) : null}
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
        {screen === 'axie' ? (
          <>
            {profile.guardianCount === 2 ? (
              <div className="guardian-switch">
                <button onClick={() => setActiveDefender(0)}>Guardián 1</button>
                <button onClick={() => setActiveDefender(1)}>Guardián 2</button>
              </div>
            ) : null}
            <AxieRoom
              axie={activeDefender === 0 ? profile.axie : profile.companion}
              onLoad={loadAxie}
              onLab={() => loadAxie(null)}
              onBrowse={() => setLibrary(true)}
            />
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
      <AppNavigation
        active={screen === 'axie' ? 'home' : screen}
        onNavigate={setScreen}
      />
      <Dialog open={roomsOpen} onOpenChange={setRoomsOpen}>
        <DialogContent className="room-picker-dialog">
          <DialogTitle>Práctica libre</DialogTitle>
          <DialogDescription>
            Elige un portal · Axie y poderes aleatorios
          </DialogDescription>
          <button
            className="m-primary"
            onClick={() => practice()}
            disabled={!ready}
          >
            <Play size={17} /> Sala aleatoria
          </button>
          <div className="practice-portals">
            <ObjectMenu
              label="Portales de práctica"
              actions={layoutExamples.map(({ level }) => ({
                id: level.layoutId ?? level.id,
                label:
                  (
                    {
                      patio: 'Patio',
                      islands: 'Islas',
                      forks: 'Jardín',
                      chimneys: 'Chimeneas',
                      bridge: 'Puente',
                      balconies: 'Balcones',
                      steps: 'Escalera',
                      tower: 'Torre',
                    } as Record<string, string>
                  )[level.layoutId ?? ''] ?? level.name,
                kind: 'portal' as const,
                onClick: () => practice(level.layoutId),
                disabled: !ready,
              }))}
            />
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={storyOpen} onOpenChange={setStoryOpen}>
        <DialogContent className="story-world-dialog">
          <DialogTitle className="sr-only">Camino de Lunacia</DialogTitle>
          <DialogDescription className="sr-only">
            Explora las cinco zonas, elige una mazmorra y recupera sus Chispas.
          </DialogDescription>
          <StoryMap
            best={profile.story}
            onPlay={story}
            onPrologue={() => {
              setStoryOpen(false);
              setIntro({ nextLevel: null });
            }}
          />
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
