# WAXIS · Vault Raiders

Prototipo jugable para una hackatón de Axie Infinity. Three.js renderiza una mazmorra 3D con física de plataformas en 2D: carrera automática, saltos con un botón, rebotes en paredes, trampas y un cofre.

## Ejecutar

Requiere Node.js 22.13 o superior.

```sh
npm install
npm run dev
```

Abrir la dirección indicada por el servidor. `npm run build` genera el paquete de producción. `npm test`, `npm run test:routes` y `npm run typecheck` verifican reglas, rutas alcanzables y tipos.

## Controles

- Espacio, flecha arriba, clic o toque: saltar.
- Saltar mientras se toca una pared: rebotar en sentido contrario.
- P o Escape: pausar/continuar. R: reiniciar.
- Las pestañas y formularios conservan navegación por teclado.

## Incluido

Tres incursiones, tres partes Classic con ilustración y procedencia oficiales, modelo Buba con animación oficial, cámara ortográfica, colisión a 120 pasos por segundo, vidas/estados, reintentos, editor de tres defensas, dos recorridos para validar el diseño y guardado local.

El cofre puede contener SLP, AXS y RON **simulados**. Se inicia con 1.250 SLP, 8 AXS y 12 RON de práctica. Los depósitos y retiros conservan el saldo total. Cada cofre de incursión se reclama una sola vez por guardado. Las pruebas del propio cofre no generan recompensas. Los importes se representan con enteros de seis decimales para evitar errores de punto flotante. No son los decimales on-chain de los tokens.

## Partes oficiales y adaptación

Fuente de las cartas nivel 1: [explorador oficial de Axie Classic](https://classic.axieinfinity.com/explorer/cards), consultado el 5 de septiembre de 2026. Las descripciones antiguas pueden diferir. Las fichas dentro del juego separan la carta original de las reglas del plataformas.

| Parte real | Carta Classic | Efecto Classic | Adaptación jugable |
| --- | --- | --- | --- |
| Lagging, cuerno | Mystic Rush | Speed− durante 2 rondas; −20% Speed | Contacto: 18 daño, velocidad ×0,8 hasta 2 saltos |
| Grass Snake, cola | Venom Spray | Aplica 1 Poison | Contacto: 18 daño, 1 acumulación; 2 HP por acumulación en cada salto posterior |
| Thorny Caterpillar, cola | Allergic Reaction | 130% daño contra objetivos con debuff | Contacto: 30 daño; 39 con Poison o Speed− |

El movimiento de las trampas, el daño reducido, el contacto como activación y un salto como acción son decisiones de WAXIS, no poderes ni reglas oficiales de Classic. El personaje Buba usa recursos oficiales de los starter Axies; sus estadísticas de Origins no se presentan como estadísticas de Classic.

## Recursos

- [Rig, textura y animaciones de Buba](https://github.com/axieinfinity/axie-starter-3d-assets/tree/a419e0cdddf7d10684547a4b5e5d25af73b7fe5c/fbx/buba). Se usa el FBX rig y únicamente los clips de los FBX de animación. La textura compartida necesita `flipY=true`. Los GLB del repositorio contienen UV/materiales antiguos y no son compatibles con esa textura.
- [Atlas y shader de partes oficial](https://github.com/axieinfinity/cc-axie-gtk2d/tree/1a446848bff0061334f32dcbd8f69ab9d36987b0/assets/axie-mixer/material/atlas-single). Los PNG separados usan las regiones originales, máscaras y paletas del shader oficial; no son diseños nuevos.
- Las ilustraciones de cartas proceden de `classic.axieinfinity.com/art/cards/`.
- `public/assets/provenance.json` conserva las URLs, coordenadas y paletas. Los derechos de Axie pertenecen a sus titulares; no se atribuye licencia MIT/CC0 a estos recursos.

## Alcance de esta versión

Funciona en un navegador compatible con WebGL 2. El progreso solo existe en ese navegador y no es una fuente de verdad financiera. No incluye PvP asíncrono entre cuentas, conexión de wallet, contratos, depósitos reales, recompensas on-chain ni verificación remota contra trampas. Ningún botón firma o envía transacciones. El diseño propio y sus pruebas se guardan localmente.

Antes de activar fondos reales: integrar Ronin Wallet; contratos de custodia limitados a tokens permitidos y sus decimales reales; un servicio que reproduzca entradas y valide la física y las dos pruebas de cada defensa; identidad, permisos y prevención de repetición por incursión; liquidación atómica y revisión de seguridad. La física determinista y el inventario de partes ofrecen una base para ese validador, pero las recompensas locales nunca deben aceptarse como prueba.

Se exponen herramientas WebMCP de consulta, inicio y traslado de tokens de práctica cuando el navegador ofrece `document.modelContext`. Su ausencia no impide jugar. No conceden ninguna capacidad sobre fondos reales.
