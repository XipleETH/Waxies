'use client';
import { t as translateText } from '@/lib/i18n/translate';
import { useLocale } from '@/lib/i18n/use-locale';

import { useEffect, useRef, useState } from 'react';
import { haptic } from '@/lib/game/haptics';
import { GameObjects } from './game-objects';
import {
  STORY_CHAPTERS,
  storyStars,
  storyUnlocked,
} from '@/lib/game/story-progress';
import courses from '@/lib/game/data/story-courses.json';
import { storyMapHeight } from '@/lib/game/story-map-layout';
import type { MapPin } from '@/lib/game/story-map-scene';
import styles from './story-map.module.css';
export function StoryMap({
  best,
  onPlay,
  onPrologue,
  onClose,
}: {
  best: number[];
  onPlay: (n: number) => void;
  onPrologue: () => void;
  onClose: () => void;
}) {
  useLocale();
  const unlocked = storyUnlocked(best);
  const [chapter, setChapter] = useState(() => Math.floor((unlocked - 1) / 10)),
    [selected, setSelected] = useState(unlocked),
    [pins, setPins] = useState<MapPin[]>([]),
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
          setFailed(false);
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
      const i = Math.max(0, Math.min(9, unlocked - chapter * 10 - 1));
      scroll.current.scrollTop = Math.max(
        0,
        (pins[i].y / 100) * storyMapHeight(chapter) -
          scroll.current.clientHeight * 0.4,
      );
    }
  }, [pins, chapter, unlocked]);
  const hp = best[selected - 1] ?? 0,
    locked = selected > unlocked,
    level = courses[selected - 1].level;
  function changeChapter(n: number) {
    haptic('select');
    setChapter(n);
    setSelected(Math.max(n * 10 + 1, Math.min(unlocked, n * 10 + 10)));
  }
  return (
    <div className={styles.map}>
      <div className={styles.scroll} ref={scroll}>
        <div
          className={styles.world}
          style={{ height: storyMapHeight(chapter) }}
        >
          <div ref={host} className={styles.scene} />
          {Array.from({ length: 10 }, (_, i) => {
            const n = chapter * 10 + i + 1,
              v = best[n - 1] ?? 0,
              p = pins[i] ?? {
                x: 50 + Math.sin(i * 1.45) * 24,
                y: 10 + i * 8.4,
              };
            return (
              <button
                key={n}
                className={styles.node}
                style={{ left: p.x + '%', top: p.y + '%' }}
                data-object="node"
                data-label={translateText(n)}
                data-value={translateText(100 - v)}
                data-stars={storyStars(v)}
                data-locked={n > unlocked}
                aria-pressed={selected === n}
                aria-label={translateText(
                  `Nivel ${n}, ${n > unlocked ? 'bloqueado' : 'disponible'}, ${v} Chispas recogidas, ${100 - v} por recoger`,
                )}
                onClick={() => {
                  haptic(n > unlocked ? 'error' : 'select');
                  setSelected(n);
                }}
              >
                {n} · {storyStars(v)}
                {translateText(' estrellas · ')}
                {100 - v}
                {translateText(' Chispas')}
              </button>
            );
          })}
          {failed ? (
            <p className={styles.fallback}>
              {translateText('Puedes seguir eligiendo niveles.')}
            </p>
          ) : null}
        </div>
      </div>
      <div className={styles.topbar}>
        <button
          data-object="book"
          aria-label={translateText('Ver prólogo')}
          onClick={onPrologue}
        >
          {translateText('Prólogo')}
        </button>
        <nav
          className={styles.zone}
          aria-label={translateText('Zonas de historia')}
        >
          <button
            data-object="previous"
            disabled={chapter === 0}
            onClick={() => changeChapter(chapter - 1)}
            aria-label={translateText('Zona anterior')}
          >
            {translateText('Anterior')}
          </button>
          <div
            className={styles.zoneName}
            data-object="title"
            data-label={translateText(STORY_CHAPTERS[chapter].name)}
            data-value={translateText(`ZONA ${chapter + 1} / 5`)}
          >
            {translateText(STORY_CHAPTERS[chapter].name)}
          </div>
          <button
            data-object="next"
            disabled={chapter === 4}
            onClick={() => changeChapter(chapter + 1)}
            aria-label={translateText('Zona siguiente')}
          >
            {translateText('Siguiente')}
          </button>
        </nav>
        <button
          data-object="close"
          aria-label={translateText('Cerrar mapa')}
          onClick={onClose}
        >
          {translateText('Cerrar')}
        </button>
      </div>
      <div className={styles.action}>
        <div
          className={styles.brief}
          data-object="title"
          data-label={translateText(level.name)}
          data-value={translateText(
            locked ? `SUPERA EL ${selected - 1}` : `${100 - hp} CHISPAS`,
          )}
        >
          {translateText(level.name)} · {100 - hp}
          {translateText(' Chispas')}
        </div>
        <button
          className={styles.play}
          data-object="portal"
          data-label={translateText(locked ? 'Bloqueado' : 'Asaltar')}
          aria-label={translateText(
            locked ? 'Bloqueado' : hp ? 'Volver a asaltar' : 'Asaltar',
          )}
          disabled={locked}
          onClick={() => {
            haptic('select');
            onPlay(selected);
          }}
        >
          {translateText('Asaltar')}
        </button>
      </div>
      <GameObjects />
    </div>
  );
}
