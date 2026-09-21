'use client';
import { useEffect, useSyncExternalStore } from 'react';
import {
  getLocale,
  getServerLocale,
  initializeLocale,
  subscribeLocale,
} from './locale';
export function useLocale() {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLocale,
    getServerLocale,
  );
  useEffect(initializeLocale, []);
  return locale;
}
