'use client';
import { useEffect, useRef } from 'react';
import { LockKeyhole, Star, Play } from 'lucide-react';
import {
  STORY_CHAPTERS,
  STORY_LENGTH,
  storyStars,
  storyUnlocked,
} from '@/lib/game/story-progress';
export function StoryMap({
  best,
  onPlay,
}: {
  best: number[];
  onPlay: (number: number) => void;
}) {
  const current = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    current.current?.scrollIntoView({ block: 'center' });
  }, []);
  const unlocked = storyUnlocked(best),
    completed = best.filter((hp) => hp > 0).length;
  return (
    <div className="story-map">
      <div className="story-summary">
        <span>
          {completed} / {STORY_LENGTH} cofres
        </span>
        <strong>
          {best.reduce((sum, hp) => sum + storyStars(hp), 0)} / 150 ★
        </strong>
      </div>
      <p className="story-free">Un jugador · Axie aleatorio · Sin billetera</p>
      {STORY_CHAPTERS.map((chapter, c) => (
        <section className="story-chapter" key={chapter.name}>
          <span className="m-eyebrow">CAPÍTULO {c + 1}</span>
          <h3>{chapter.name}</h3>
          <p>{chapter.text}</p>
          <div className="story-levels">
            {Array.from({ length: 10 }, (_, i) => {
              const number = c * 10 + i + 1,
                hp = best[number - 1] ?? 0,
                locked = number > unlocked;
              return (
                <button
                  key={number}
                  ref={number === unlocked ? current : undefined}
                  disabled={locked}
                  className={
                    hp ? 'cleared' : number === unlocked ? 'current' : ''
                  }
                  aria-label={`Nivel ${number}${locked ? ', bloqueado' : hp ? `, ${storyStars(hp)} estrellas, mejor salud ${hp}` : ', disponible'}`}
                  onClick={() => onPlay(number)}
                >
                  <span>
                    {locked ? (
                      <LockKeyhole size={15} />
                    ) : number === unlocked && !hp ? (
                      <Play size={13} />
                    ) : null}
                    {number}
                  </span>
                  <small aria-hidden="true">
                    {hp
                      ? Array.from({ length: 3 }, (_, j) => (
                          <Star
                            key={j}
                            size={9}
                            fill={j < storyStars(hp) ? 'currentColor' : 'none'}
                          />
                        ))
                      : locked
                        ? '—'
                        : 'JUGAR'}
                  </small>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <p className="story-free">
        1 estrella al llegar · 2 con 60 de salud · 3 sin golpes.
        <br />
        Repite para mejorar tu marca. Las Chispas solo pagan la mejora.
      </p>
    </div>
  );
}
