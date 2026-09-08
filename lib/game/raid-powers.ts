import { PARTS } from './catalog';
import type { Pattern } from './recipes';
const MOVEMENT: Record<Pattern, string> = {
  bolt: 'Lanza proyectiles rectos tras un aviso. Salta sobre el disparo y cruza entre ráfagas.',
  arc: 'Dispara en arco. Mira dónde aterriza y evita coincidir con la caída del proyectil.',
  fan: 'Abre un abanico de proyectiles. Gana altura o deja pasar la ráfaga antes de acercarte.',
  burst:
    'Dispara una ráfaga de proyectiles. Espera al último disparo antes de cruzar.',
  dash: 'Fija una dirección durante el aviso y embiste. Salta sobre su recorrido; también debes esquivarla mientras regresa.',
  bite: 'Ataca de cerca tras un aviso. Salta por encima de su alcance; el cuerpo es peligroso incluso entre ataques.',
  sniper:
    'Apunta a tu posición durante el aviso. Cambia de altura o de lado antes del disparo: la mira no te persigue después.',
  aura: 'Emite un pulso tras un aviso dorado. El área iluminada daña mientras está activa; cruza cuando se apague o salta fuera del anillo. El pulso dañino es una adaptación para las mazmorras; conserva sus efectos de apoyo compatibles de Classic.',
  barrier:
    'Ocupa espacio como una barrera de contacto. Rodéala con un salto: no puedes romperla con un pisotón en este modo.',
  boomerang:
    'El proyectil sale y regresa. No aterrices en su trayecto de vuelta.',
};
export function raidPowerDescription(id: string) {
  if (id === 'carrot')
    return 'Lanza zanahorias en línea recta. Salta sobre el proyectil y cruza durante la recuperación. Carrot Hammer recupera energía al romperse su escudo en Classic; aquí el lanzador es una adaptación visual y no se rompe.';
  if (id === 'grass-snake')
    return 'Lanza un abanico venenoso que deja charcos al caer. El veneno bloquea zonas de aterrizaje: usa otra altura o espera a que se disipe. No resta salud después del golpe, porque ese contacto ya reinicia el intento.';
  if (['thorny-caterpillar', 'cactus', 'pupae'].includes(id))
    return 'Despliega espinas alrededor tras un aviso. Mantente fuera del anillo durante el ataque y salta sobre su cuerpo en la recuperación. El círculo visible marca su alcance.';
  if (id === 'lagging')
    return 'Avisa y embiste en una dirección fija. Salta sobre el recorrido y evita su regreso. Speed Down es un efecto real de Mystic Rush en Classic; aquí no se conserva después del contacto porque el intento se reinicia.';
  return MOVEMENT[PARTS[id].recipe.pattern];
}
