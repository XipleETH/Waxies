'use client';
import { useRef, useState, type PointerEvent } from 'react';
import Image from 'next/image';
import { PARTS } from '@/lib/game/catalog';
import { PORTRAIT_BASE } from '@/lib/game/portrait';
import { snapTrap, validFreeTraps } from '@/lib/game/free-vault';
import { reachSettings } from '@/lib/game/trap-reach';
import type { Trap } from '@/lib/game/physics';
import styles from './vault-editor.module.css';
export function MobileVaultEditor({
  traps,
  onChange,
}: {
  traps: Trap[];
  onChange: (traps: Trap[]) => void;
}) {
  const [selected, setSelected] = useState(0),
    [draft, setDraft] = useState<Trap[] | null>(null),
    [error, setError] = useState('');
  const board = useRef<HTMLDivElement>(null),
    drag = useRef<{
      index: number;
      mode: 'position' | 'reach';
      traps: Trap[];
      startX: number;
      startReach: number;
      direction: number;
    } | null>(null);
  const shown = draft ?? traps,
    index = Math.min(selected, shown.length - 1),
    t = shown[index],
    settings = reachSettings(t.part),
    reach = t.reach ?? settings.default;
  function start(
    e: PointerEvent<HTMLButtonElement>,
    i: number,
    mode: 'position' | 'reach',
  ) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(i);
    drag.current = {
      index: i,
      mode,
      traps: traps.map((t) => ({ ...t })),
      startX: e.clientX,
      startReach: traps[i].reach ?? reachSettings(traps[i].part).default,
      direction: traps[i].x > 6 ? -1 : 1,
    };
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current,
      r = board.current?.getBoundingClientRect();
    if (!d || !r) return;
    const x = ((e.clientX - r.left) / r.width) * 12,
      y = 22 - ((e.clientY - r.top) / r.height) * 22,
      old = d.traps[d.index],
      rule = reachSettings(old.part);
    const change =
      d.mode === 'position'
        ? snapTrap(x, y)
        : {
            reach:
              Math.round(
                Math.max(
                  rule.min,
                  Math.min(
                    rule.max,
                    d.startReach +
                      ((e.clientX - d.startX) / r.width) * 12 * d.direction,
                  ),
                ) * 10,
              ) / 10,
          };
    d.traps = d.traps.map((t, i) => (i === d.index ? { ...t, ...change } : t));
    setDraft(d.traps);
  }
  function end() {
    const d = drag.current;
    drag.current = null;
    setDraft(null);
    if (!d) return;
    if (validFreeTraps(d.traps)) {
      onChange(d.traps);
      setError('');
    } else
      setError(
        'Deja espacio junto a la entrada, el cofre y las otras trampas.',
      );
  }
  const endX =
      t.x > 6
        ? Math.max(1.2, t.x - Math.max(2.1, reach))
        : Math.min(10.8, t.x + Math.max(2.1, reach)),
    endY = t.y;
  return (
    <section className={styles.editor} aria-label="Editor táctil de trampas">
      <p>
        Arrastra una trampa a otra plataforma. Arrastra el extremo dorado para
        cambiar su alcance.
      </p>
      <div className={styles.board} ref={board}>
        <svg viewBox="0 0 120 220" aria-hidden="true">
          <rect x="4" y="2" width="112" height="216" rx="5" fill="#172f2d" />
          <path
            d="M10 4V210H110V4"
            fill="none"
            stroke="#638d72"
            strokeWidth="2"
          />
          {PORTRAIT_BASE.platforms.map((p, i) => (
            <rect
              key={i}
              x={(p.x - p.w / 2) * 10}
              y={220 - (p.y + p.h / 2) * 10}
              width={p.w * 10}
              height={p.h * 10}
              rx="1"
              fill="#75a18a"
            />
          ))}
          {settings.kind === 'radius' ? (
            <circle
              cx={t.x * 10}
              cy={220 - t.y * 10}
              r={reach * 10}
              fill="#edc97b22"
              stroke="#edc97b"
              strokeDasharray="2 2"
            />
          ) : (
            <path
              d={`M${Math.max(1.2, t.x - reach) * 10} ${220 - t.y * 10}H${Math.min(10.8, t.x + reach) * 10}`}
              stroke="#edc97b"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}
          <text x="84" y="20" fill="#e6c477" fontSize="10">
            ▣
          </text>
          <text x="15" y="209" fill="#b7e3ce" fontSize="8">
            ↥
          </text>
        </svg>
        {shown.map((trap, i) => (
          <button
            key={trap.anchor}
            className={`${styles.trap} ${index === i ? styles.selected : ''}`}
            style={{
              left: (trap.x / 12) * 100 + '%',
              top: ((22 - trap.y) / 22) * 100 + '%',
            }}
            aria-label={`Mover ${PARTS[trap.part].name}, trampa ${i + 1}`}
            aria-pressed={index === i}
            onClick={() => setSelected(i)}
            onPointerDown={(e) => start(e, i, 'position')}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={() => {
              drag.current = null;
              setDraft(null);
            }}
          >
            <Image
              unoptimized
              src={PARTS[trap.part].partImage}
              alt=""
              width={34}
              height={34}
            />
            <span>{i + 1}</span>
          </button>
        ))}
        {settings.kind !== 'fixed' ? (
          <button
            className={styles.handle}
            aria-label="Arrastrar alcance de la trampa"
            style={{
              left: (endX / 12) * 100 + '%',
              top: ((22 - endY) / 22) * 100 + '%',
            }}
            onPointerDown={(e) => start(e, index, 'reach')}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={() => {
              drag.current = null;
              setDraft(null);
            }}
          >
            ↔
          </button>
        ) : null}
      </div>
      <div className={styles.selectedInfo}>
        <strong>{PARTS[t.part].name}</strong>
        <span>
          {settings.label} · {reach.toFixed(1)} m
        </span>
      </div>
      <p className={styles.note}>
        Las paredes frenan los ataques. Las líneas muestran el alcance máximo;
        la trampa apunta al jugador al avisar.
      </p>
      {error ? <output className={styles.error}>{error}</output> : null}
    </section>
  );
}
