'use client';
import { raidPowerDescription } from '@/lib/game/raid-powers';
import { t as translateText } from '@/lib/i18n/translate';
import { useLocale } from '@/lib/i18n/use-locale';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, LockKeyhole, Search } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { ObjectDialogContent } from './object-dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PART_LIST, type PartId } from '@/lib/game/catalog';
import { BODY_PARTS } from '@/lib/game/axie';
export function PartLibrary({
  open,
  onOpenChange,
  onInspect,
  available,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onInspect: (id: PartId) => void;
  available: PartId[];
}) {
  const locale = useLocale();
  const [query, setQuery] = useState(''),
    [cl, setCl] = useState('all'),
    [slot, setSlot] = useState('all'),
    [tab, setTab] = useState('cards'),
    [limit, setLimit] = useState(24),
    [filters, setFilters] = useState(false);
  const cards = useMemo(
    () =>
      PART_LIST.filter(
        (p) =>
          (cl === 'all' || p.class.toLowerCase() === cl) &&
          (slot === 'all' || p.slotId === slot) &&
          [
            p.name,
            p.card,
            p.original,
            p.arcade,
            raidPowerDescription(p.id, locale),
          ]
            .join(' ')
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, cl, slot, locale],
  );
  const bodies = useMemo(
    () =>
      BODY_PARTS.filter(
        (p) =>
          (cl === 'all' || p.class === cl) &&
          (slot === 'all' || p.slot === slot) &&
          p.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, cl, slot],
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ObjectDialogContent
        className="catalog-dialog"
        title={translateText('Poderes')}
        description={translateText('Elige una pieza para conocer su poder.')}
        onClose={() => onOpenChange(false)}
      >
        <div className="object-catalog-toolbar">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(String(v));
              setSlot('all');
              setLimit(24);
            }}
          >
            <TabsList>
              <TabsTrigger
                value="cards"
                data-object="powers"
                data-label={translateText('Poderes')}
              >
                {translateText('132 poderes')}
              </TabsTrigger>
              <TabsTrigger
                value="body"
                data-object="axie"
                data-label={translateText('Piezas')}
              >
                {translateText('Todas las piezas')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <button
            className="arsenal-search-toggle"
            data-object="search"
            data-label={translateText('Buscar')}
            onClick={() => setFilters((v) => !v)}
            aria-expanded={filters}
          >
            <Search size={16} />
            {translateText(' Buscar')}
          </button>
        </div>
        {filters ? (
          <div className="catalog-filters">
            <div className="catalog-search">
              <Search size={16} />
              <Input
                aria-label={translateText('Buscar parte o habilidad')}
                placeholder={translateText('Parte, carta o efecto…')}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(24);
                }}
              />
            </div>
            <Select
              value={cl}
              onValueChange={(v) => {
                setCl(v ?? 'all');
                setLimit(24);
              }}
            >
              <SelectTrigger aria-label={translateText('Filtrar por clase')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {translateText('Todas las clases')}
                </SelectItem>
                {['beast', 'aquatic', 'plant', 'bird', 'bug', 'reptile'].map(
                  (c) => (
                    <SelectItem key={c} value={c}>
                      {translateText(c[0].toUpperCase() + c.slice(1))}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <Select
              value={slot}
              onValueChange={(v) => {
                setSlot(v ?? 'all');
                setLimit(24);
              }}
            >
              <SelectTrigger aria-label={translateText('Filtrar por pieza')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {translateText('Todas las piezas')}
                </SelectItem>
                {Object.entries({
                  mouth: 'Boca',
                  horn: 'Cuerno',
                  back: 'Espalda',
                  tail: 'Cola',
                  ...(tab === 'body' ? { eyes: 'Ojos', ears: 'Orejas' } : {}),
                }).map(([id, label]) => (
                  <SelectItem key={id} value={id}>
                    {translateText(label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="catalog-count">
          {tab === 'cards' ? cards.length : bodies.length}
          {translateText(' resultados')}
          {translateText(' ')}
          <span>
            {translateText(
              tab === 'cards'
                ? 'Los candados indican partes ajenas al Axie cargado.'
                : 'Ojos y orejas no generan trampas en Classic.',
            )}
          </span>
        </div>
        <div className="catalog-scroll" data-object-scroll>
          <div className="catalog-grid">
            {tab === 'cards'
              ? cards.slice(0, limit).map((p) => (
                  <button
                    className="catalog-part"
                    key={p.id}
                    onClick={() => onInspect(p.id)}
                  >
                    <div
                      className="catalog-part-image"
                      style={{ background: p.color + '15' }}
                    >
                      <Image
                        unoptimized
                        src={p.partImage}
                        width={100}
                        height={80}
                        alt={''}
                      />
                      {!available.includes(p.id) ? (
                        <LockKeyhole size={15} />
                      ) : null}
                    </div>
                    <strong
                      data-object="title"
                      data-label={translateText(p.name)}
                    >
                      {translateText(p.name)}
                    </strong>
                    <span>
                      {translateText(p.slot)} · {translateText(p.class)}
                    </span>
                    <b>{translateText(p.card)}</b>
                    <small>{translateText(p.short)}</small>
                  </button>
                ))
              : bodies.slice(0, limit).map((p) => (
                  <article
                    className="catalog-part body-catalog-part"
                    key={p.id}
                  >
                    <div className="catalog-part-image">
                      {p.image ? (
                        <Image
                          unoptimized
                          src={p.image}
                          width={100}
                          height={80}
                          alt={''}
                        />
                      ) : (
                        <span>{translateText('Arte no disponible')}</span>
                      )}
                    </div>
                    <strong>{translateText(p.name)}</strong>
                    <span>
                      {translateText(p.slot)} · {translateText(p.class)}
                    </span>
                    <small>
                      {translateText(
                        p.standard ? 'Estándar' : 'Variante cosmética',
                      )}
                      {translateText(
                        p.cardId ? ' · Carta base' : ' · Sin carta',
                      )}
                    </small>
                  </article>
                ))}
          </div>
          {(tab === 'cards' ? cards.length : bodies.length) === 0 ? (
            <p className="catalog-empty">
              {translateText('No hay piezas que coincidan con esos filtros.')}
            </p>
          ) : null}
          {(tab === 'cards' ? cards.length : bodies.length) > limit ? (
            <button
              className="secondary-button catalog-more"
              data-object="next"
              data-label={translateText('Más')}
              onClick={() => setLimit((n) => n + 24)}
            >
              {translateText('Mostrar 24 más')}
            </button>
          ) : null}
        </div>
        <a
          className="source-link"
          href="/investigacion"
          target="_blank"
          rel="noreferrer"
        >
          {translateText('Investigación completa y reglas de adaptación')}
          {translateText(' ')}
          <ArrowUpRight size={14} />
        </a>
      </ObjectDialogContent>
    </Dialog>
  );
}
