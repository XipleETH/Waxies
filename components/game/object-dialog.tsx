'use client';
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
  return (
    <DialogContent
      className={'object-dialog ' + className}
      showCloseButton={false}
    >
      <GameObjects />
      <header className="object-dialog-heading">
        <DialogTitle data-object="title" data-label={title}>
          {title}
        </DialogTitle>
        <button
          type="button"
          data-object="close"
          aria-label="Cerrar"
          onClick={onClose}
        >
          Cerrar
        </button>
      </header>
      <DialogDescription>{description}</DialogDescription>
      <div className="object-dialog-body" data-object-scroll>
        {children}
      </div>
    </DialogContent>
  );
}
