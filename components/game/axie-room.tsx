'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { AxieLoadout as Loadout } from '@/lib/game/axie';
import { ObjectMenu } from './object-menu';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
const AxieLoadout = dynamic(() =>
  import('./axie-loadout').then((m) => m.AxieLoadout),
);
export function AxieRoom({
  axie,
  onLoad,
  onLab,
  onBrowse,
}: {
  axie: Loadout | null | undefined;
  onLoad: (a: Loadout) => void;
  onLab: () => void;
  onBrowse: () => void;
}) {
  const [panel, setPanel] = useState<'wallet' | 'id' | 'file' | null>(null);
  return (
    <section className="axie-object-room" aria-label="Mi Axie">
      <div className="object-room-title">
        <span>{axie ? 'AXIE #' + axie.id : 'AXIE DE PRUEBA'}</span>
      </div>
      <div className="axie-object-actions">
        <ObjectMenu
          label="Acciones de Mi Axie"
          actions={[
            {
              id: 'wallet',
              label: 'Billetera',
              kind: 'wallet',
              onClick: () => setPanel('wallet'),
            },
            {
              id: 'id',
              label: 'Invocar',
              kind: 'portal',
              onClick: () => setPanel('id'),
            },
            {
              id: 'parts',
              label: 'Poderes',
              kind: 'book',
              onClick: onBrowse,
              badge: '132',
            },
            {
              id: 'file',
              label: 'Archivo',
              kind: 'scroll',
              onClick: () => setPanel('file'),
            },
          ]}
        />
        {axie ? (
          <button className="object-small-action" onClick={onLab}>
            Axie de prueba
          </button>
        ) : null}
      </div>
      <Dialog
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <DialogContent className="power-dialog axie-action-dialog">
          <DialogTitle>
            {panel === 'wallet'
              ? 'Billetera'
              : panel === 'id'
                ? 'Invocar Axie'
                : 'Archivo de partes'}
          </DialogTitle>
          <DialogDescription>
            {panel === 'wallet'
              ? 'Elige uno de tus Axies.'
              : panel === 'id'
                ? 'Introduce su ID o enlace de App.Axie.'
                : 'Importa sus metadatos para probar las partes.'}
          </DialogDescription>
          {panel ? (
            <AxieLoadout
              view={panel}
              axie={axie}
              onLoad={(a) => {
                onLoad(a);
                setPanel(null);
              }}
              onLab={onLab}
              onBrowse={onBrowse}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
