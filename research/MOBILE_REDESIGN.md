# Rediseño móvil y trampas · 6 septiembre 2026

## Decisiones respaldadas por referencias

Ultimate Chicken Horse combina construcción con ejecución de saltos y esquiva. Su editor permite compartir desafíos. Tomamos esa relación entre colocación, trayectoria y habilidad del jugador; WAXIS conserva su carrera automática y un solo botón. [Descripción del editor móvil, Noodlecake](https://noodlecake.com/games/ultimate-chicken-horse/).

Clever Endeavour recomienda variedad de desafíos, espacio para correr y evitar cuellos de botella que puedan volverse imposibles. Los ocho mapas alternan patios compactos, islas, bifurcaciones, pilares, puentes y balcones, con tres estaciones separadas. El desafío viene del momento del salto y la trayectoria de ataque. Estas son decisiones propias a partir de la guía, no medidas copiadas de UCH. [Criterios oficiales de niveles destacados](https://cleverendeavourgames.freshdesk.com/support/solutions/articles/32000028928-how-do-i-get-my-level-featured-in-the-game-).

La regla de daño sigue la petición del usuario inspirada en King of Thieves: un contacto reinicia el intento y reduce la salud y el premio. Como referencia adicional, la ayuda del evento Living Totem describe reinicios tras trampas y salud decreciente; es una regla documentada de ese evento, no una afirmación sobre todos los modos de KoT. [Ayuda de Living Totem](https://zepto.helpshift.com/hc/pt/3-king-of-thieves/faq/1187-living-totem/?p=ios&s=dungeons).

Las habilidades originales siguen el catálogo de Axie Classic nivel 1 previamente investigado. El juego expone el texto original por separado de su adaptación. No trasladamos nombres de Origins ni inventamos cartas para ojos y orejas. [Explorador oficial de Classic](https://classic.axieinfinity.com/explorer/cards).

## Reglas del modo vertical

- Ocho geometrías de práctica, con alturas de 13 a 22 unidades, anchuras de 12 o 14 y tres defensas. El editor propio conserva su torre original de siete plataformas.
- Carrera automática 5,2 unidades/s, salto 12,7, gravedad 24, simulación 120 Hz.
- Salud 100. Cada contacto perjudicial resta 20 una sola vez y congela el intento durante 0,65 s antes de reconstruir su estado inicial.
- Se conservan salud, contador de golpes, apariencia y distribución. Se reinician posición, proyectiles, charcos, energía y tiempos de las trampas.
- El quinto golpe termina la partida. Reiniciar manualmente conserva salud; empezar una nueva partida crea una recompensa independiente.
- Recompensa = salud restante al abrir el cofre. Solo puede recogerse una vez por partida. Las demostraciones y validaciones propias no dan Chispas.
- Las defensas permanecen opacas. Recuperarse de un ataque no equivale a desaparecer ni a permitir contacto seguro.

## Familias de obstáculos

| Familia | Lectura para el jugador | Respuesta útil |
|---|---|---|
| Disparo recto | Aviso direccional y proyectil visible | Saltar sobre la línea y cruzar el intervalo |
| Arco / abanico | Varias alturas o caída balística | Cambiar plataforma y evitar el aterrizaje |
| Ráfaga | Varios disparos espaciados | Esperar al último proyectil |
| Embestida | Dirección fijada durante el aviso | Saltar su recorrido y vigilar su retorno |
| Ataque cercano | Cuerpo persistente con aviso de activación | Rodearlo por arriba sin pisarlo |
| Espinas | Anillo que muestra el radio real | Mantener distancia durante el pulso |
| Disparo dirigido | Mira fija, no seguimiento instantáneo | Abandonar el lugar apuntado |
| Bumerán | Trayectoria de salida y vuelta | No aterrizar en el retorno |
| Barrera | Obstáculo físico permanente | Desviar el salto |
| Apoyo | Enlaces de equipo durante activación | Esquivar el cuerpo; el aura no es daño remoto |

El aviso base dura 0,65 s. Las recuperaciones dejan un intervalo entre ataques. Los muros y plataformas bloquean proyectiles y ataques radiales. Los charcos venenosos duran 2,2 s y se crean sobre superficies horizontales, nunca flotando en una pared.

## Classic frente a plataformas

Carrot Hammer recupera energía cuando su escudo se rompe en Classic. El lanzador de zanahorias es la representación de plataformas solicitada; en este modo no hay ruptura por pisotón. No se anuncia esa recuperación como si funcionara aquí.

Grass Snake conserva la asociación real al veneno. Como el primer contacto ya reinicia, Poison se representa mediante proyectiles y charcos que impiden aterrizar en ciertas zonas, sin un daño acumulativo posterior.

Lagging / Mystic Rush tiene Speed Down en Classic. Con reinicio inmediato sería incoherente prometer ralentización tras acertar: su adaptación actual es una embestida anticipada que obliga a modificar el salto. No aplica una ralentización invisible.

Thorny usa un área de espinas anticipada. Su multiplicador condicional de daño Classic no se convierte en golpes de distinto coste: todos los contactos del modo cuestan 20, tal como pide la regla de salud.

Las 132 cartas conservan diez recetas físicas explícitas. Las reglas de equipo compatibles, como energía para ráfagas y Speed+ de defensas, pueden afectar ciclos. Curaciones, críticos, escudos, bloqueos de cartas y efectos tras un golpe del combate anterior no equivalen a ventajas ofensivas contra un jugador que reinicia al tocar. La ficha móvil describe el patrón que sí se juega. El código y la matriz del combate anterior se mantienen como referencia histórica, separados de la experiencia actual.

## Pruebas de superabilidad

`route-solver.ts` realiza una búsqueda acotada: cada 12 fotogramas de simulación explora saltar o continuar, descarta cualquier trayectoria que reciba daño y conserva estados prometedores. El resultado contiene los fotogramas exactos de salto. `verifyRoute` vuelve a ejecutar esos datos desde cero, exige 100 de salud y llegar al cofre en el fotograma declarado.

Se guardaron **115 configuraciones sobre ocho mapas distintos**, que cubren **las 132 partes con carta**. Primero se selecciona el mapa entre los diferentes al anterior y después una combinación certificada de sus trampas. Así no se favorecen las salas con más variantes. Las miniaturas permiten elegir un mapa concreto. La apariencia de Axie se genera de forma independiente. No mezcla libremente tres partes a la hora de jugar. El bot se usa fuera de la partida; el móvil solo reproduce una prueba ligera.

La demostración reproduce esos mismos saltos dentro del motor Three.js. Las repeticiones compartidas admiten hasta cinco minutos y 3000 pulsaciones; el buscador automático usa un horizonte menor. La versión de reglas forma parte del certificado. Si cambia la física o una distribución, la prueba debe repetirse. Una prueba exitosa demuestra existencia de una ruta; no sustituye pruebas con personas, medición de dificultad ni un servidor contra trampas.

## Defensa propia, economía y móvil

El editor guarda borradores localmente, pero solo habilita compartir después de una partida del usuario con cero golpes verificada por simulación. Editar una trampa elimina su certificado. Los enlaces incluyen configuración, apariencia de mazmorra y prueba; el destinatario vuelve a verificarla. No hay publicación en una lista global ni resultados sincronizados entre cuentas.

Chispas compra temas musgo/amatista/ámbar y adornos cristales/faroles. Es una moneda local de prototipo. Los pagos SLP, AXS, RON y USDC son una fase posterior y no están conectados.

La partida usa toda el área disponible en vertical, con HUD arriba y salto al alcance del pulgar abajo. La cámara encaja cada sala completa. Una pantalla vertical no obliga a alargar todas las mazmorras: las salas compactas dejan margen de fondo y ofrecen recorridos breves. `100dvh` y las áreas seguras evitan ocultar controles bajo barras del sistema. Fullscreen se solicita en el gesto de entrada cuando el navegador lo admite; el modo instalado usa manifiesto standalone y orientación portrait.

## Diversidad espacial y comprobación

Las plantillas editables están en `lib/game/practice-layouts.ts`. `courses:generate` reconstruye cada configuración desde su plantilla y vuelve a buscar la ruta. Las pruebas comprueban ocho geometrías diferentes, variedad de alturas y que el modo aleatorio no repita el mismo diseño en entradas consecutivas. Se descartaron combinaciones que cerraban el aterrizaje en los pilares y se asignaron a salas con más espacio; no se publican como rutas posibles por intuición.
