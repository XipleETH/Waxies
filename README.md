# WAXIS · Vault Raiders

Juego de plataformas 2.5D para una hackatón de Axie Infinity. Three.js dibuja los Axies oficiales; la física corre en 2D a 120 pasos por segundo. La experiencia principal es una app web vertical para teléfono.

## Ejecutar y comprobar

Node.js 22.13 o superior:

```sh
npm ci
npm run dev
npm test
npm run courses:verify
npm run typecheck
npm run build
```

`npm run story:generate` reequilibra las defensas y recalcula sus certificados conservando los 50 números y geometrías publicados. `npm run courses:verify` comprueba tanto Práctica como Historia.

`npm run courses:reach` asigna alcances variados y vuelve a certificar las 165 configuraciones de Historia y Práctica. Ejecutarlo después de regenerar pistas conserva esta variedad.

`npm run courses:generate` vuelve a buscar una ruta sin golpes para cada configuración con el mismo simulador del juego. Solo sobrescribe los certificados si todas las pistas pasan. Una búsqueda fallida no demuestra que un nivel sea imposible.

## Jugar

- Lobby a pantalla completa con el Axie 3D animado en un refugio personal y controles flotantes. El fondo refleja el tema equipado, el adorno, las defensas guardadas y el estado de validación. Accesos a Historia, Online, Práctica, Refugio, Bazar y Mi Axie.
- Prólogo animado «La guerra de los cofres»: cuatro escenas 3D con Axies oficiales, recursos guardados y guardianes dormidos. Se muestra una vez al entrar a Historia y se repite desde Capítulos; incluye pausa, movimiento reducido y opción de saltarlo.
- Historia de un jugador: 50 niveles fijos en cinco capítulos, Axie aleatorio gratuito y desbloqueo secuencial. Las defensas crecen por tramos: una en los niveles 1–3, dos en el 4–10, tres en el 11–25, cuatro en el 26–40 y cinco en el 41–50. Capítulos permite repetir niveles para mejorar de una a tres estrellas.
- La campaña amplía las ocho familias de salas con variantes de plataformas y defensas; cada uno de sus 50 trazados tiene una repetición sin golpes comprobada. La dificultad estimada combina margen de pulsación, saltos, duración y trampas. Es una primera calibración, no una medición de dificultad humana.
- Práctica conserva ocho mapas con geometrías diferentes: patio, islas, jardín partido, chimeneas, puente, balcones, escalera rota y torre. Sus 115 combinaciones certificadas cubren las 132 cartas Classic. El azar cambia de mapa entre entradas; «Práctica» abre las miniaturas para escoger una sala concreta.
- El Axie corre solo. Tocar, Espacio o Flecha arriba salta. Saltar contra una pared permite rebotar. P/Escape pausa y R vuelve al inicio conservando salud.
- Cualquier contacto dañino con una defensa, proyectil o charco reinicia el intento y resta 20 de salud. La pista, el Axie y el ciclo inicial se conservan. Cinco golpes agotan el premio.
- En Historia, guardar el resultado desbloquea el siguiente nivel. El primer premio equivale a la salud restante; las repeticiones solo pagan la mejora sobre el mejor premio previo. Tres estrellas requieren 100 de salud; dos, al menos 60; una, llegar. Práctica mantiene sus premios por partida. La repetición del bot no concede premios ni desbloqueos.
- Chispas compra tres temas y dos adornos, visibles en el lobby y la mazmorra propia. Son puntos locales; no existe conversión a dinero ni pagos con tokens.
- La partida ocupa el área disponible con `100dvh` y zonas seguras. Intenta entrar en Fullscreen al pulsar Jugar si el navegador lo admite. El manifiesto pide orientación vertical; en iOS puede añadirse a la pantalla de inicio para abrirla como app independiente.

La certificación y la estimación de dificultad se explican en [STORY_MODE.md](research/STORY_MODE.md).

## Construir y compartir

El editor individual permite un guardián con entre una y cuatro defensas sobre una torre de siete plataformas. Cada guardián aporta una boca, un cuerno, una espalda y una cola. Puedes añadir o quitar partes, arrastrarlas entre superficies y ajustar el alcance mediante el control dorado o un deslizador. Al cargar un Axie solo se habilitan sus cartas dominantes. Ojos y orejas son cosméticos; no se inventan cartas para ellos. Sin Axie, el laboratorio permite probar las 132 partes.

Cada sala muestra sus guardianes animados en pedestales exteriores sobre el techo. Usan el Mixer oficial: los Axies cargados conservan sus genes y los guardianes del laboratorio se forman con las partes de las trampas. No tienen colisión. Detalles en [GUARDIANS.md](research/GUARDIANS.md).

Los cambios se guardan como **borrador**. Para guardar una defensa validada, el jugador debe alcanzar el cofre desde el inicio con 100 de salud y cero contactos. El motor registra los saltos y vuelve a simular la ruta. Modificar una trampa invalida la prueba. Los temas y adornos no afectan la colisión y no la invalidan.

Compartir crea un enlace que contiene la disposición, los genes de los guardianes, el estilo y la repetición. Al abrirlo, el cliente vuelve a comprobar la ruta antes de permitir el ataque. Los enlaces antiguos siguen funcionando. El nuevo modo Online publica defensas y resuelve ataques entre cuentas cuando se configura Neon Postgres; véase [ONLINE.md](research/ONLINE.md).

## Cartas y poderes

El catálogo conserva 132 cartas Classic de nivel 1, 192 partes estándar y 87 variantes cosméticas documentadas. Los datos originales están en `lib/game/data/classic-cards.json`; las adaptaciones físicas, en `recipes.ts` y `raid-powers.ts`. La ficha separa la habilidad original de las reglas del modo de plataformas.

Los cuerpos de las trampas permanecen visibles durante todo el ciclo. Los avisos preceden a proyectiles, abanicos, embestidas, ataques cercanos, espinas y bumeranes. La mira de un disparo dirigido queda fijada durante el aviso. Los suelos bloquean ataques y los charcos solo se forman en superficies.

El modo móvil no permite pisotones ofensivos, veneno acumulativo tras el contacto ni Último Aliento del jugador. Condiciones Classic que dependen de esos sistemas no se presentan como habilidades equivalentes. Consulta [la investigación del rediseño](research/MOBILE_REDESIGN.md) y `/investigacion`.

## Axies y recursos oficiales

Se conservan el modelo por genes, los esqueletos, las animaciones y el shader del Mixer oficial. Incluye ocho cuerpos, 575 variantes completas, 733 modelos y 513 texturas. Las variantes ausentes usan sustituciones documentadas; no se crean piezas nuevas. Detalles en [MIXER_3D.md](research/MIXER_3D.md).

- [Mixer 3D oficial](https://github.com/axieinfinity/unity-axie-mixer3d), revisión `63ec82afc7deeec242734e70fea4bb9fffa904cc`.
- [Buba oficial](https://github.com/axieinfinity/axie-starter-3d-assets/tree/a419e0cdddf7d10684547a4b5e5d25af73b7fe5c/fbx/buba), usado también como respaldo.
- [Atlas oficial de partes](https://github.com/axieinfinity/cc-axie-gtk2d/tree/1a446848bff0061334f32dcbd8f69ab9d36987b0/assets/axie-mixer/material/atlas-single).
- [Explorador Classic](https://classic.axieinfinity.com/explorer/cards).

`GET /api/axie/:id` consulta genes y propietario en el contrato Ronin `0x32950db2a7164ae833121501c797d79e7b79d74c`. Las lecturas se fijan al mismo bloque. Ronin Wallet comparte la cuenta y enumera sus Axies; no solicita firmas ni transacciones. Consultar un ID público no acredita que quien lo escribe controle esa billetera.

Los recursos pertenecen a sus titulares. Las procedencias detalladas están en `public/assets/provenance.json`, `public/assets/carrot-provenance.json` y `research/`.

## Guardado y alcance

`waxies.mobile.v1` guarda Chispas, compras, Axie, defensa y mejores resultados de Historia en el navegador. Las defensas anteriores al editor libre se migran a cuatro partes compatibles de un guardián y vuelven a borrador: necesitan una nueva validación sin golpes. Se conservan los resultados de Historia, Chispas y compras. Los perfiles anteriores a Historia reciben una campaña vacía. El guardado antiguo `waxis.practice.v1` se conserva y solo se importa su selección de Axie compatible. Los saldos simulados SLP/AXS/RON del prototipo anterior no se convierten en Chispas. El motor y las pruebas del combate anterior permanecen como referencia técnica; la portada usa las reglas `portrait-raid-v1`.

Los certificados prueban que existe una ruta con estas reglas; no que sea fácil para todos los jugadores ni que el cliente sea una fuente confiable para dinero. Antes de vender cosméticos con SLP, AXS, RON o USDC hacen falta autenticación, inventario y validación de recompensas en servidor, además de integración de pagos. No hay pagos ni recompensas on-chain activos.

## Publicación

Next.js 16 / Node.js 22. El repositorio [XipleETH/Waxies](https://github.com/XipleETH/Waxies) está conectado con Vercel; los pushes a `main` publican [waxies.vercel.app](https://waxies.vercel.app/). Preset Next.js, raíz del repositorio, `npm ci` y `npm run build`. No se necesitan secretos para la demo de lecturas públicas de Ronin.

El modo Online necesita `DATABASE_URL` (o `POSTGRES_URL`) de Neon en el servidor. Sin esa variable, muestra «Preparando el servidor» y no simula rivales ni transferencias. La instalación de Neon en Vercel requiere que el titular acepte los términos del proveedor.
