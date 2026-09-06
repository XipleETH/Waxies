import { PARTS } from './catalog';
import { decodeGenes } from './genes';
import { randomAxie } from './random-axie';
import type { Dungeon } from './physics';
export interface Guardian {
  name: string;
  genes: string;
  traps: number[];
}
const geneSlots = ['eyes', 'mouth', 'ears', 'horn', 'back', 'tail'];
const classes: Record<string, number> = {
  beast: 0,
  bug: 1,
  bird: 2,
  plant: 3,
  aquatic: 4,
  reptile: 5,
};
function seeded(seed: string) {
  let n = 2166136261;
  for (const c of seed) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return () => {
    n += 0x6d2b79f5;
    let t = n;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Synthetic guardian appearance, never a claimed NFT. Dominant genes match real Classic part IDs. */
export function guardianGenes(parts: string[], seed: string) {
  let value = BigInt(randomAxie(seeded(seed)).genes);
  const seen = new Set<string>();
  for (const id of parts) {
    const part = PARTS[id];
    if (!part || seen.has(part.slotId))
      throw Error('Un guardián admite una parte de cada tipo.');
    seen.add(part.slotId);
    const [cl, , variant] = part.partId.split('-');
    const slot = geneSlots.indexOf(part.slotId);
    const start = 128 + 64 * slot;
    const put = (offset: number, width: number, n: number) => {
      const shift = BigInt(512 - offset - width),
        mask = ((BigInt(1) << BigInt(width)) - BigInt(1)) << shift;
      value = (value & ~mask) | (BigInt(n) << shift);
    };
    put(start + 12, 3, 0);
    put(start + 16, 9, 0);
    put(start + 25, 5, classes[cl]);
    put(start + 30, 8, Number(variant));
  }
  const genes = '0x' + value.toString(16).padStart(128, '0');
  if (parts.some((id) => !decodeGenes(genes).some((p) => p.card === id)))
    throw Error('No se pudo resolver una parte del guardián.');
  return genes;
}
/** One distinct power per body slot, at most two Axies. */
export function guardianGroups(parts: string[]): number[][] {
  if (!parts.length || parts.length > 8 || new Set(parts).size !== parts.length)
    throw Error('La mazmorra necesita entre 1 y 8 trampas diferentes.');
  const groups: number[][] = [[]];
  parts.forEach((id, index) => {
    const part = PARTS[id];
    if (!part) throw Error('Parte desconocida.');
    let group = groups.find(
      (g) => !g.some((i) => PARTS[parts[i]].slotId === part.slotId),
    );
    if (!group) {
      if (groups.length === 2)
        throw Error(
          'Dos guardianes admiten como máximo dos partes de cada tipo.',
        );
      group = [];
      groups.push(group);
    }
    group.push(index);
  });
  return groups;
}
export function dungeonGuardians(
  level: Pick<Dungeon, 'id' | 'traps' | 'guardianGenes'>,
): Guardian[] {
  const parts = level.traps.map((t) => t.part);
  if (level.guardianGenes?.length) {
    if (level.guardianGenes.length > 2) throw Error('Máximo dos guardianes.');
    const groups = level.guardianGenes.map(() => [] as number[]);
    for (const [index, id] of parts.entries()) {
      const owner = level.guardianGenes.findIndex(
        (genes, g) =>
          (level.traps[index].anchor === undefined ||
            Math.floor(level.traps[index].anchor! / 4) === g) &&
          decodeGenes(genes).some((p) => p.card === id) &&
          !groups[g].some((i) => PARTS[parts[i]].slotId === PARTS[id].slotId),
      );
      if (owner < 0) throw Error('Una trampa no pertenece a sus guardianes.');
      groups[owner].push(index);
    }
    if (parts.length > 8 || new Set(parts).size !== parts.length)
      throw Error('Trampas repetidas o demasiadas.');
    return level.guardianGenes.map((genes, i) => ({
      name: 'Guardián ' + (i + 1),
      genes,
      traps: groups[i],
    }));
  }
  return guardianGroups(parts).map((indices, i) => ({
    name: 'Guardián ' + (i + 1),
    genes: guardianGenes(
      indices.map((n) => parts[n]),
      level.id + '-' + i,
    ),
    traps: indices,
  }));
}
