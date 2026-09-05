export const PARTS = {
  'carrot': { name: 'Carrot', card: 'Carrot Hammer', slot: 'Cola', class: 'Plant', color: '#ffb34e', image: '/assets/carrot.png', partId: 'plant-tail-02', attack: 80, shield: 50, energy: 1,
    effect: 'Gana 1 energía al romperse su escudo. Solo una vez por ronda.', original: 'Gain 1 energy if this Axie’s shield breaks. Can only trigger once per round.',
    short: 'Lanzador · escudo reactivo', arcade: 'Apunta, avisa y lanza una zanahoria: 20 de daño. Caer sobre su escudo lo rompe y te hace rebotar. Gana 1 energía para un disparo extra en la siguiente ráfaga, una vez por ciclo. El escudo se recarga después. En Classic es una carta cuerpo a cuerpo; el lanzador es nuestra adaptación.' },
  'lagging': { name: 'Lagging', card: 'Mystic Rush', slot: 'Cuerno', class: 'Bug', color: '#fda37d', image: '/assets/lagging.png', partId: 'bug-horn-02', attack: 40, shield: 0, energy: 0,
    effect: 'Aplica Speed− al objetivo durante 2 rondas.', original: 'Apply Speed- to target for 2 rounds.',
    short: 'Embestida · velocidad −20%', arcade: 'Detecta al Axie, marca su trayectoria y embiste. Impacto: 12 de daño y Speed− durante 2 saltos. Durante el regreso no hace daño. Esquiva cuando veas el aviso rojo.' },
  'grass-snake': { name: 'Grass Snake', card: 'Venom Spray', slot: 'Cola', class: 'Reptile', color: '#b5a1ff', image: '/assets/grass-snake.png', partId: 'reptile-tail-12', attack: 20, shield: 20, energy: 0,
    effect: 'Aplica 1 acumulación de Poison al objetivo.', original: 'Apply 1 Poison to target.',
    short: 'Rocío · charcos de veneno', arcade: 'Escupe tres gotas en arco. Cada impacto aplica 1 Poison y 12 de daño. Las gotas dejan charcos de 2,2 segundos sobre el suelo. Cada salto posterior consume 2 de vida por acumulación. Salta por encima del rocío y de los charcos.' },
  'thorny-caterpillar': { name: 'Thorny Caterpillar', card: 'Allergic Reaction', slot: 'Cola', class: 'Bug', color: '#efaf69', image: '/assets/thorny-caterpillar.png', partId: 'bug-tail-12', attack: 100, shield: 40, energy: 1,
    effect: 'Inflige el 130% del daño a objetivos con un efecto negativo.', original: 'Deal 130% damage to debuffed targets.',
    short: 'Espinas · reacción a debuffs', arcade: 'Se activa por proximidad: avisa y despliega espinas a su alrededor durante medio segundo. Inflige 30 de daño; 39 si ya tienes Poison o Speed−. Cruza cuando las espinas estén retraídas.' },
} as const;
export type PartId = keyof typeof PARTS;
export const CLASSIC_SOURCE = 'https://classic.axieinfinity.com/explorer/cards';
