'use client';
import { useEffect, useRef } from 'react';
import type { MenuObject } from '@/lib/game/object-menu-scene';
import styles from './object-menu.module.css';
export interface ObjectAction {
  id: string;
  label: string;
  kind: MenuObject;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
}
export function ObjectMenu({
  actions,
  label,
  layout = 'grid',
}: {
  actions: ObjectAction[];
  label: string;
  layout?: 'grid' | 'corner';
}) {
  const host = useRef<HTMLDivElement>(null),
    kinds = actions.map((a) => a.kind).join('|');
  useEffect(() => {
    let stopped = false,
      dispose = () => {};
    void import('@/lib/game/object-menu-scene')
      .then(({ createObjectMenu }) => {
        if (stopped || !host.current) return;
        const scene = createObjectMenu(
          host.current,
          kinds.split('|') as MenuObject[],
          layout,
        );
        dispose = () => scene.dispose();
      })
      .catch(() => {});
    return () => {
      stopped = true;
      dispose();
    };
  }, [kinds, layout]);
  return (
    <nav
      className={
        styles.objects + (layout === 'corner' ? ' ' + styles.corner : '')
      }
      aria-label={label}
      data-count={actions.length}
      data-layout={layout}
      style={
        layout === 'grid' && actions.length > 4
          ? {
              height: Math.ceil(actions.length / 2) * 160,
              gridTemplateRows: `repeat(${Math.ceil(actions.length / 2)},1fr)`,
            }
          : undefined
      }
    >
      <div ref={host} className={styles.scene} />
      {actions.map((a) => (
        <button
          key={a.id}
          onClick={a.onClick}
          disabled={a.disabled}
          aria-label={a.label}
        >
          <span>{a.label}</span>
          {a.badge ? <small>{a.badge}</small> : null}
        </button>
      ))}
    </nav>
  );
}
