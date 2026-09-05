export const PARTS = {
  'lagging': { name: 'Lagging', card: 'Mystic Rush', slot: 'Cuerno', class: 'Bug', color: '#fda37d', image: '/assets/lagging.png', partId: 'bug-horn-02', attack: 40, shield: 0, energy: 0,
    effect: 'Aplica Speed− al objetivo durante 2 rondas.', original: 'Apply Speed- to target for 2 rounds.',
    short: 'Velocidad −20%', arcade: 'Al contacto: 18 de daño y velocidad −20% hasta completar 2 saltos. Un salto representa una acción del prototipo.' },
  'grass-snake': { name: 'Grass Snake', card: 'Venom Spray', slot: 'Cola', class: 'Reptile', color: '#b5a1ff', image: '/assets/grass-snake.png', partId: 'reptile-tail-12', attack: 20, shield: 20, energy: 0,
    effect: 'Aplica 1 acumulación de Poison al objetivo.', original: 'Apply 1 Poison to target.',
    short: 'Veneno acumulable', arcade: 'Al contacto: 18 de daño y 1 Poison. Cada salto posterior consume 2 de vida por acumulación hasta terminar el intento.' },
  'thorny-caterpillar': { name: 'Thorny Caterpillar', card: 'Allergic Reaction', slot: 'Cola', class: 'Bug', color: '#efaf69', image: '/assets/thorny-caterpillar.png', partId: 'bug-tail-12', attack: 100, shield: 40, energy: 1,
    effect: 'Inflige el 130% del daño a objetivos con un efecto negativo.', original: 'Deal 130% damage to debuffed targets.',
    short: '+30% contra debuffs', arcade: 'Al contacto: 30 de daño; 39 si ya tienes Poison o Speed−. Conserva la condición de daño de Classic.' },
} as const;
export type PartId = keyof typeof PARTS;
export const CLASSIC_SOURCE = 'https://classic.axieinfinity.com/explorer/cards';
