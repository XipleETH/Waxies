'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
  Sparkles,
  Star,
  Play,
  BookOpen,
  Check,
} from 'lucide-react';
import {
  STORY_CHAPTERS,
  STORY_LENGTH,
  storyStars,
  storyUnlocked,
} from '@/lib/game/story-progress';
import courses from '@/lib/game/data/story-courses.json';
import { storyMapHeight } from '@/lib/game/story-map-layout';
import { dungeonGuardians } from '@/lib/game/guardians';
import type { MapPin } from '@/lib/game/story-map-scene';
import styles from './story-map.module.css';
export function StoryMap({
  best,
  onPlay,
  onPrologue,
}: {
  best: number[];
  onPlay: (number: number) => void;
  onPrologue: () => void;
}) {
  const unlocked = storyUnlocked(best);
  const [chapter, setChapter] = useState(() => Math.floor((unlocked - 1) / 10));
  const [selected, setSelected] = useState(unlocked);
  const [pins, setPins] = useState<MapPin[]>([]),
    [failed, setFailed] = useState(false);
  const host = useRef<HTMLDivElement>(null),
    scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let stopped = false,
      dispose = () => {};
    void import('@/lib/game/story-map-scene')
      .then(({ createStoryMapScene }) => {
        if (!stopped && host.current) {
          const scene = createStoryMapScene(
            host.current,
            chapter,
            best,
            unlocked,
            setPins,
          );
          dispose = () => scene.dispose();
        }
      })
      .catch(() => {
        if (!stopped) setFailed(true);
      });
    return () => {
      stopped = true;
      dispose();
    };
  }, [chapter, best, unlocked]);
  useEffect(() => {
    if (pins.length && scroll.current) {
      const index = Math.max(0, Math.min(9, unlocked - chapter * 10 - 1));
      scroll.current.scrollTop = Math.max(
        0,
        (pins[index].y / 100) * storyMapHeight(chapter) -
          scroll.current.clientHeight * 0.4,
      );
    }
  }, [pins, chapter, unlocked]);
  const hp = best[selected - 1] ?? 0,
    locked = selected > unlocked,
    level = courses[selected - 1].level;
  function changeChapter(next: number) {
    setChapter(next);
    setSelected(Math.max(next * 10 + 1, Math.min(unlocked, next * 10 + 10)));
  }
  return (
    <div className={styles.map}>
      <header className={styles.heading}>
        <div>
          <small>LA GUERRA DE LOS COFRES</small>
          <h2>Lunacia</h2>
        </div>
        <button
          onClick={onPrologue}
          aria-label="Ver prólogo"
          className={styles.lore}
        >
          <BookOpen size={20} />
        </button>
      </header>
      <div className={styles.progress}>
        <span>
          <Check size={14} /> {best.filter((h) => h > 0).length}/{STORY_LENGTH}
        </span>
        <span>
          <Sparkles size={14} /> {best.reduce((a, b) => a + b, 0)} / 5000
          recogidas
        </span>
      </div>
      <nav className={styles.chapters} aria-label="Zonas de historia">
        <button
          disabled={chapter === 0}
          onClick={() => changeChapter(chapter - 1)}
          aria-label="Zona anterior"
        >
          <ChevronLeft />
        </button>
        <div>
          <small>ZONA {chapter + 1} / 5</small>
          <strong>{STORY_CHAPTERS[chapter].name}</strong>
        </div>
        <button
          disabled={chapter === 4}
          onClick={() => changeChapter(chapter + 1)}
          aria-label="Zona siguiente"
        >
          <ChevronRight />
        </button>
      </nav>
      <div className={styles.scroll} ref={scroll}>
        <div className={styles.world} style={{ height: storyMapHeight(chapter) }}>
          <div ref={host} className={styles.scene} />
          {Array.from({ length: 10 }, (_, i) => {
            const n = chapter * 10 + i + 1,
              value = best[n - 1] ?? 0,
              isLocked = n > unlocked,
              pin = pins[i] ?? {
                x: 50 + Math.sin(i * 1.45) * 24,
                y: 10 + i * 8.4,
              };
            return (
              <button
                key={n}
                className={`${styles.node} ${selected === n ? styles.selected : ''} ${isLocked ? styles.locked : ''}`}
                style={{ left: pin.x + '%', top: pin.y + '%' }}
                onClick={() => setSelected(n)}
                aria-pressed={selected === n}
                aria-label={`Nivel ${n}, ${isLocked ? 'bloqueado' : 'disponible'}, ${value} Chispas recogidas, ${100 - value} por recoger`}
              >
                <span className={styles.number}>
                  {isLocked ? <LockKeyhole size={12} /> : null}
                  {n}
                </span>
                <span
                  className={styles.stars}
                  aria-label={`${storyStars(value)} estrellas`}
                >
                  {[0, 1, 2].map((j) => (
                    <Star
                      key={j}
                      size={12}
                      fill={j < storyStars(value) ? 'currentColor' : 'none'}
                    />
                  ))}
                </span>
                <small>
                  <Sparkles size={11} /> {100 - value}
                  {value === 100 ? <Check size={11} /> : null}
                </small>
              </button>
            );
          })}
          {failed ? (
            <p className={styles.fallback}>
              Vista sencilla · puedes seguir eligiendo mazmorras.
            </p>
          ) : null}
        </div>
      </div>
      <section className={styles.preview} aria-label={`Mazmorra ${selected}`}>
        <div className={styles.title}>
          <span>{selected}</span>
          <div>
            <small>
              {level.traps.length}{' '}
              {level.traps.length === 1 ? 'TRAMPA' : 'TRAMPAS'} ·{' '}
              {dungeonGuardians(level).length}{' '}
              {dungeonGuardians(level).length === 1 ? 'GUARDIÁN' : 'GUARDIANES'}
            </small>
            <h3>{level.name}</h3>
          </div>
        </div>
        <div className={styles.loot}>
          <span>
            <Sparkles size={17} />
            <b>{100 - hp}</b> por recoger
          </span>
          <span>
            <Check size={15} />
            <b>{hp}</b> recogidas
          </span>
        </div>
        <button
          className="m-primary"
          disabled={locked}
          onClick={() => onPlay(selected)}
        >
          {locked ? (
            <LockKeyhole size={18} />
          ) : (
            <Play size={18} fill="currentColor" />
          )}
          {locked
            ? `Completa el nivel ${selected - 1}`
            : hp
              ? 'Volver a asaltar'
              : 'Asaltar'}
        </button>
        <small className={styles.rule}>
          {locked
            ? 'Sigue el camino para abrir esta mazmorra.'
            : hp
              ? 'Solo recibes Chispas si mejoras tu marca.'
              : 'Hasta 100 Chispas · cada golpe reduce el premio.'}
        </small>
      </section>
    </div>
  );
}
