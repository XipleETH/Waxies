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

Tres incursiones, 132 cartas Classic con ilustración y procedencia oficiales, modelo Buba con animación oficial, cámara ortográfica, colisión a 120 pasos por segundo, vidas/estados, reintentos, editor de cuatro defensas, dos recorridos para validar el diseño y guardado local.

El cofre puede contener SLP, AXS y RON **simulados**. Se inicia con 1.250 SLP, 8 AXS y 12 RON de práctica. Los depósitos y retiros conservan el saldo total. Cada cofre de incursión se reclama una sola vez por guardado. Las pruebas del propio cofre no generan recompensas. Los importes se representan con enteros de seis decimales para evitar errores de punto flotante. No son los decimales on-chain de los tokens.

## Catálogo y partes del Axie

132 defensas basadas en las cartas Classic de nivel 1; 192 partes estándar y 87 variantes cosméticas documentadas. El juego incluye un catálogo con búsqueda y filtros y una investigación completa en /investigacion. La matriz editable está en research/classic-defense-matrix.csv y la procedencia en research/.

En Mi mazmorra, un ID de Axie consulta el endpoint oficial de metadatos y decodifica sus genes dominantes de 512 bits. Solo las cuatro cartas de sus partes pueden equiparse. Ojos y orejas no reciben ataques inventados. Las skins recientes se resuelven por genes y usan arte base identificado cuando su ilustración no está disponible; las evoluciones juegan con la carta de nivel 1. La consulta de un ID no verifica propiedad de la wallet. Sin un Axie cargado funciona el laboratorio libre.

Las recetas son explícitas para cada carta: diez patrones físicos, combos, estados, curación, escudo, energía, robo/descarte adaptado, reflejo y Last Stand. Los pisotones permiten interactuar con las defensas sin añadir otro botón. En research/AXIE_CLASSIC.md y /investigacion están las sustituciones entre combate por turnos y plataformas.

## Recursos

- [Rig, textura y animaciones de Buba](https://github.com/axieinfinity/axie-starter-3d-assets/tree/a419e0cdddf7d10684547a4b5e5d25af73b7fe5c/fbx/buba). Se usa el FBX rig y únicamente los clips de los FBX de animación. La textura compartida necesita `flipY=true`. Los GLB del repositorio contienen UV/materiales antiguos y no son compatibles con esa textura.
- [Atlas y shader de partes oficial](https://github.com/axieinfinity/cc-axie-gtk2d/tree/1a446848bff0061334f32dcbd8f69ab9d36987b0/assets/axie-mixer/material/atlas-single). Los PNG separados usan las regiones originales, máscaras y paletas del shader oficial; no son diseños nuevos.
- Las ilustraciones de cartas proceden de `classic.axieinfinity.com/art/cards/`.
- `public/assets/provenance.json` y `public/assets/carrot-provenance.json` conservan las URLs, coordenadas y paletas. Los derechos de Axie pertenecen a sus titulares; no se atribuye licencia MIT/CC0 a estos recursos.

## Alcance de esta versión

Funciona en un navegador compatible con WebGL 2. El progreso solo existe en ese navegador y no es una fuente de verdad financiera. No incluye PvP asíncrono entre cuentas, conexión de wallet, contratos, depósitos reales, recompensas on-chain ni verificación remota contra trampas. Ningún botón firma o envía transacciones. El diseño propio y sus pruebas se guardan localmente.

Antes de activar fondos reales: integrar Ronin Wallet; contratos de custodia limitados a tokens permitidos y sus decimales reales; un servicio que reproduzca entradas y valide la física y las dos pruebas de cada defensa; identidad, permisos y prevención de repetición por incursión; liquidación atómica y revisión de seguridad. La física determinista y el inventario de partes ofrecen una base para ese validador, pero las recompensas locales nunca deben aceptarse como prueba.

Se exponen herramientas WebMCP de consulta, inicio y traslado de tokens de práctica cuando el navegador ofrece `document.modelContext`. Su ausencia no impide jugar. No conceden ninguna capacidad sobre fondos reales.

La versión de reglas 3 conserva saldos, cofres, recompensas reclamadas y posiciones de guardados anteriores. Añade una cuarta ranura e invalida únicamente las pruebas de defensa: los nuevos ataques requieren repetir los dos recorridos.

### Consulta pública y archivos
El proveedor puede responder 403 a peticiones del servidor. En ese caso se muestra el rechazo y el editor permite importar un JSON de metadatos obtenido por el usuario. Los archivos se marcan como `metadata-file`: se validan genes y estructura, pero no autenticidad ni propiedad. No se utilizan proxies para eludir la protección del proveedor.
