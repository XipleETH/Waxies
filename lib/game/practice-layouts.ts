import type { Dungeon, Rect, Trap } from './physics';
import { PORTRAIT_BASE } from './portrait';
export interface PracticeLayout {
  id: string;
  name: string;
  subtitle: string;
  room: NonNullable<Dungeon['room']>;
  platforms: Rect[];
  chest: { x: number; y: number };
  stations: Array<{ x: number; y: number }>;
  theme: string;
}
const blocks = (rows: number[][]): Rect[] =>
  rows.map(([x, y, w, h = 0.55]) => ({ x, y, w, h }));
const room = (h: number, w = 12) => ({ w, h, left: 1, right: w - 1, floor: 1 });
/** Hand-authored topology. Station coordinates are above supporting surfaces. */
export const PRACTICE_LAYOUTS: PracticeLayout[] = [
  {
    id: 'patio',
    name: 'El patio de las raíces',
    subtitle:
      'Una sala corta: cruza el patio y cambia de lado para alcanzar el balcón.',
    room: room(13),
    theme: 'moss',
    platforms: blocks([
      [8.2, 3.1, 5.6],
      [3.6, 5.65, 5.2],
      [8, 8.25, 6],
      [3.2, 10.5, 4.4],
    ]),
    chest: { x: 2.4, y: 11.3 },
    stations: [
      { x: 9.3, y: 3.9 },
      { x: 2.4, y: 6.45 },
      { x: 8.9, y: 9.05 },
    ],
  },
  {
    id: 'islands',
    name: 'Las islas suspendidas',
    subtitle:
      'Salta de isla en isla. Los huecos permiten caer a una ruta inferior y volver a subir.',
    room: room(17),
    theme: 'amethyst',
    platforms: blocks([
      [5.2, 3, 2.6],
      [9.2, 5.3, 3.6],
      [5, 7.5, 2.4],
      [2.6, 9.8, 3.2],
      [5.7, 12, 4.2],
      [8.4, 14.3, 5.2],
    ]),
    chest: { x: 9.5, y: 15.1 },
    stations: [
      { x: 9.8, y: 6.1 },
      { x: 2, y: 10.6 },
      { x: 4.2, y: 12.8 },
    ],
  },
  {
    id: 'forks',
    name: 'El jardín partido',
    subtitle:
      'Dos balcones a la misma altura: elige por dónde rodear las defensas.',
    room: room(18),
    theme: 'moss',
    platforms: blocks([
      [2.8, 3, 3.6],
      [9.2, 3, 3.6],
      [5.6, 5.5, 3.4],
      [2.4, 8, 2.8],
      [9, 8, 4],
      [5.9, 10.5, 3],
      [2.6, 13, 3.2],
      [8.8, 13, 4.4],
      [5.8, 15.5, 4],
    ]),
    chest: { x: 5.8, y: 16.3 },
    stations: [
      { x: 9.7, y: 3.8 },
      { x: 5, y: 6.3 },
      { x: 9.7, y: 13.8 },
    ],
  },
  {
    id: 'chimneys',
    name: 'Las chimeneas de ámbar',
    subtitle:
      'Usa los costados de los pilares para ganar altura con rebotes cortos.',
    room: room(19),
    theme: 'ember',
    platforms: blocks([
      [4.8, 5.2, 2.4, 8.4],
      [8.5, 8, 2.4, 8.2],
      [4, 14.5, 6],
    ]),
    chest: { x: 2.8, y: 15.3 },
    stations: [
      { x: 4.8, y: 10.2 },
      { x: 9.25, y: 12.9 },
      { x: 5.8, y: 15.3 },
    ],
  },
  {
    id: 'bridge',
    name: 'El puente del guardián',
    subtitle:
      'Rodea el gran puente por sus extremos y busca el salto hacia la isla del cofre.',
    room: room(15, 14),
    theme: 'ember',
    platforms: blocks([
      [5.2, 3, 3],
      [11.2, 5.4, 3.6],
      [7, 8, 10],
      [6.5, 10.6, 2.8],
      [10.3, 12.5, 3.4],
    ]),
    chest: { x: 10.8, y: 13.3 },
    stations: [
      { x: 11.9, y: 6.2 },
      { x: 4.5, y: 8.8 },
      { x: 9.7, y: 8.8 },
    ],
  },
  {
    id: 'balconies',
    name: 'Los balcones olvidados',
    subtitle:
      'Alterna saltos largos y descansos pequeños. No todos los balcones llegan a la pared.',
    room: room(20),
    theme: 'amethyst',
    platforms: blocks([
      [8.8, 3.1, 4.4],
      [3, 5.3, 4],
      [7, 7.6, 3],
      [2.5, 10.3, 3],
      [8.6, 12.4, 4.8],
      [4.8, 14.7, 3.2],
      [8.7, 17, 4.6],
    ]),
    chest: { x: 9.3, y: 17.8 },
    stations: [
      { x: 2, y: 6.1 },
      { x: 7.8, y: 13.2 },
      { x: 4.2, y: 15.5 },
    ],
  },
  {
    id: 'steps',
    name: 'La escalera rota',
    subtitle:
      'Pequeños escalones y un pilar central: enlaza saltos y aprovecha sus costados.',
    room: room(15),
    theme: 'moss',
    platforms: blocks([
      [4, 2.5, 2],
      [7.8, 4.4, 2.6],
      [4.8, 7, 1.4, 3],
      [9.2, 8.5, 3.6],
      [3.6, 10.8, 5.2],
      [8.5, 12.8, 5],
    ]),
    chest: { x: 9.5, y: 13.6 },
    stations: [
      { x: 8.4, y: 5.2 },
      { x: 2.5, y: 11.6 },
      { x: 4, y: 3.3 },
    ],
  },
  {
    id: 'tower',
    name: 'La torre de los ecos',
    subtitle:
      'Un ascenso largo entre paredes: conserva el ritmo hasta el último cambio de lado.',
    room: room(22),
    theme: 'amethyst',
    platforms: PORTRAIT_BASE.platforms,
    chest: { x: 8.8, y: 20.28 },
    stations: [
      { x: 3.4, y: 6.55 },
      { x: 5.8, y: 11.85 },
      { x: 3.4, y: 17.15 },
    ],
  },
];
export function practiceDungeon(
  layout: PracticeLayout,
  parts: string[],
  variant = 0,
): Dungeon {
  const traps: Trap[] = layout.stations.map((station, i) => ({
    ...station,
    part: parts[i],
    patrol: 0,
    phase: i * 1.5,
  }));
  return {
    id: layout.id + '-' + variant,
    layoutId: layout.id,
    name: layout.name,
    subtitle: layout.subtitle,
    difficulty: layout.room.h <= 15 ? 'Sala compacta' : 'Exploración',
    rules: 'raid',
    room: layout.room,
    spawn: { x: 2.2, y: 1.38 },
    chest: layout.chest,
    platforms: layout.platforms,
    traps,
    theme: layout.theme,
  };
}
