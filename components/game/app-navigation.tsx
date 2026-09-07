'use client';
import {
  Home,
  Castle,
  ShoppingBag,
  Sparkles,
  Play,
  Save,
  Pencil,
} from 'lucide-react';
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
    { id: 'shop', label: 'Bazar', Icon: ShoppingBag },
    { id: 'axie', label: 'Mi Axie', Icon: Sparkles },
  ] as const;
  return (
    <nav className={styles.bar} aria-label="Navegación principal">
      {entries.map(({ id, label, Icon }) => (
        <button
          key={id}
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
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
