'use client';
import { t as translateText } from '@/lib/i18n/translate';
import { useLocale } from '@/lib/i18n/use-locale';

import { Home, Castle, Play, Save, Pencil } from 'lucide-react';
import styles from './app-navigation.module.css';
export type AppScreen = 'home' | 'vault' | 'shop' | 'axie' | 'online';
export function AppNavigation({
  active,
  onNavigate,
  vaultAction,
}: {
  active: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  vaultAction?: {
    label: 'Probar' | 'Guardar' | 'Editar';
    onClick: () => void;
    disabled?: boolean;
  };
}) {
  useLocale();
  const entries = [
    { id: 'home', label: 'Jugar', Icon: Home },
    {
      id: 'vault',
      label: vaultAction?.label ?? 'Refugio',
      Icon: vaultAction
        ? vaultAction.label === 'Guardar'
          ? Save
          : vaultAction.label === 'Editar'
            ? Pencil
            : Play
        : Castle,
    },
  ] as const;
  return (
    <nav
      className={styles.bar}
      aria-label={translateText('Navegación principal')}
    >
      {entries.map(({ id, label, Icon }) => (
        <button
          key={id}
          data-object={
            id === 'home'
              ? 'home'
              : !vaultAction
                ? 'map'
                : label === 'Guardar'
                  ? 'save'
                  : label === 'Editar'
                    ? 'edit'
                    : 'play'
          }
          data-label={translateText(label)}
          data-frame="true"
          aria-label={translateText(label)}
          className={active === id ? styles.active : ''}
          aria-current={active === id ? 'page' : undefined}
          disabled={id === 'vault' && vaultAction?.disabled}
          onClick={() =>
            id === 'vault' && vaultAction
              ? vaultAction.onClick()
              : onNavigate(id)
          }
        >
          <Icon size={23} />
          <span>{translateText(label)}</span>
        </button>
      ))}
    </nav>
  );
}
