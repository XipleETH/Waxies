'use client';
import { t as translateText } from '@/lib/i18n/translate';
import { useLocale } from '@/lib/i18n/use-locale';

import { GameObjects } from './game-objects';
import type { MenuObject } from '@/lib/game/object-menu-scene';
import styles from './object-menu.module.css';
export interface ObjectAction {
  id: string;
  label: string;
  kind: MenuObject;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
  variant?: string;
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
  useLocale();
  return (
    <nav
      className={
        styles.objects + (layout === 'corner' ? ' ' + styles.corner : '')
      }
      aria-label={translateText(label)}
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
      <GameObjects />
      {actions.map((a) => (
        <button
          key={a.id}
          data-object={a.kind}
          data-label={translateText(a.label)}
          data-caption={translateText(a.badge)}
          data-variant={a.variant}
          onClick={a.onClick}
          disabled={a.disabled}
          aria-label={translateText(a.label)}
        >
          <span>{translateText(a.label)}</span>
          {a.badge ? <small>{translateText(a.badge)}</small> : null}
        </button>
      ))}
    </nav>
  );
}
