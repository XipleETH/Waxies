'use client';
import { t as translateText } from '@/lib/i18n/translate';
import { useLocale } from '@/lib/i18n/use-locale';

import type { ReactNode } from 'react';
import {
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { GameObjects } from './game-objects';
export function ObjectDialogContent({
  title,
  description,
  onClose,
  children,
  className = '',
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  useLocale();
  return (
    <DialogContent
      className={'object-dialog ' + className}
      showCloseButton={false}
    >
      <GameObjects />
      <header className="object-dialog-heading">
        <DialogTitle data-object="title" data-label={translateText(title)}>
          {translateText(title)}
        </DialogTitle>
        <button
          type="button"
          data-object="close"
          aria-label={translateText('Cerrar')}
          onClick={onClose}
        >
          {translateText('Cerrar')}
        </button>
      </header>
      <DialogDescription>{translateText(description)}</DialogDescription>
      <div className="object-dialog-body" data-object-scroll>
        {translateText(children)}
      </div>
    </DialogContent>
  );
}
