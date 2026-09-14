'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { AxieLoadout as Loadout } from '@/lib/game/axie';
import { HapticToggle } from './haptic-toggle';
import { ObjectDialogContent } from './object-dialog';
import { ObjectMenu } from './object-menu';
import { Dialog } from '@/components/ui/dialog';
const AxieLoadout = dynamic(() =>
  import('./axie-loadout').then((m) => m.AxieLoadout),
);
const EmoteGallery = dynamic(() =>
  import('./emote-gallery').then((m) => m.EmoteGallery),
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
  const [galleryOpen, setGalleryOpen] = useState(false);
  return (
    <section className="axie-object-room" aria-label="Mi Axie">
      <div
        className="object-room-title"
        data-object="title"
        data-label={axie ? 'AXIE #' + axie.id : 'AXIE DE PRUEBA'}
      >
        <span>{axie ? 'AXIE #' + axie.id : 'AXIE DE PRUEBA'}</span>
      </div>
      <HapticToggle />
      <div className="axie-object-actions">
        <ObjectMenu
          label="Acciones de Mi Axie"
          layout="corner"
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
              kind: 'summon',
              onClick: () => setPanel('id'),
            },
            {
              id: 'parts',
              label: 'Poderes',
              kind: 'powers',
              onClick: onBrowse,
              badge: '132',
            },
            {
              id: 'file',
              label: 'Archivo',
              kind: 'scroll',
              onClick: () => setPanel('file'),
            },
            {
              id: 'gestures',
              label: 'Gestos',
              kind: 'emotes',
              badge: '20',
              onClick: () => setGalleryOpen(true),
            },
          ]}
        />
        {axie ? (
          <button className="object-small-action" onClick={onLab}>
            Axie de prueba
          </button>
        ) : null}
      </div>
      {galleryOpen ? (
        <EmoteGallery onClose={() => setGalleryOpen(false)} />
      ) : null}
      <Dialog
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <ObjectDialogContent
          title={
            panel === 'wallet'
              ? 'Billetera'
              : panel === 'id'
                ? 'Invocar'
                : 'Archivo'
          }
          description={
            panel === 'wallet'
              ? 'Elige uno de tus Axies.'
              : panel === 'id'
                ? 'Introduce el ID de tu Axie.'
                : 'Importa las partes de tu Axie.'
          }
          onClose={() => setPanel(null)}
          className="axie-action-dialog"
        >
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
        </ObjectDialogContent>
      </Dialog>
    </section>
  );
}
