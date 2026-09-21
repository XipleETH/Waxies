'use client';
import { t as translateText } from '@/lib/i18n/translate';
import { useLocale } from '@/lib/i18n/use-locale';

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { PARTS } from '@/lib/game/catalog';
export function PartPicker({
  value,
  available,
  onChange,
  label,
}: {
  value: string;
  available: string[];
  onChange: (value: string) => void;
  label: string;
}) {
  useLocale();
  return (
    <Combobox
      items={available}
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v);
      }}
      itemToStringLabel={(v) => PARTS[v]?.name ?? v}
    >
      <ComboboxInput
        aria-label={translateText(label)}
        placeholder={translateText('Buscar parte…')}
      />
      <ComboboxContent>
        <ComboboxEmpty>
          {translateText('No hay partes disponibles.')}
        </ComboboxEmpty>
        <ComboboxList>
          {(id: string) => (
            <ComboboxItem key={id} value={id}>
              {translateText(PARTS[id].name)} · {translateText(PARTS[id].slot)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
