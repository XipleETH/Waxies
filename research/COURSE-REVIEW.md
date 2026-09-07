# Revisión de recorridos y poderes — 2026-09-07

## Resultado

Se revisaron las 50 pistas de historia y las 115 variantes de práctica. Se conservaron las piezas Classic, sus reglas de combate y la progresión del número de defensas. Cambiaron sus posiciones, fases y alcances, además de las entradas y los cofres de parte del catálogo.

| Catálogo | Ascensos | Descensos | Cofre intermedio | Defensas próximas a la ruta |
| --- | ---: | ---: | ---: | ---: |
| Historia | 29 | 10 | 11 | 172 / 172 |
| Práctica | 58 | 30 | 27 | 345 / 345 |

La auditoría inicial encontraba 82/172 defensas próximas en historia y 195/345 en práctica. La cercanía se mide durante la repetición certificada, con visibilidad sin plataformas interpuestas, respecto al cuerpo, ataque activo, proyectiles o charcos. El umbral es una unidad desde el borde de colisión. Es una señal de exposición, no una demostración de que todas las rutas alternativas estén bloqueadas ni una medida completa de dificultad humana.

No se gana ninguna de las 165 salas sin pulsar salto durante el horizonte comprobado (como mínimo 40 segundos). Todas tienen una repetición sin golpes con la física real a 120 Hz. En los 50 niveles de historia, desplazar alguno de los saltos probados 50 o 100 ms produce al menos un golpe. Cinco variantes de práctica no producen golpes con esa perturbación concreta; siguen teniendo encuentros cercanos.

## Gráficos y distancia

Las piezas conservan sus recursos originales. Se añadieron fondos claros, contornos persistentes, avisos amarillos, ataques coral y brillo en los proyectiles. La puerta se dibuja en la posición real de entrada.

El editor muestra el alcance numérico y la trayectoria de los disparos. La vista previa comparte los parámetros de lanzamiento y colisión con el juego; se corta al encontrar suelo, techo o plataformas. Para disparos dirigidos representa un objetivo a la misma altura; durante la partida apuntan al jugador. La distancia limita el recorrido del proyectil, no solo su desplazamiento horizontal; los bumeranes distinguen ida y vuelta.

## Verificación

- `npm test`: 77 pruebas aprobadas.
- `npm run build`: compilación y certificación de las 165 rutas aprobadas.
- `npm run typecheck`: aprobado.
- Oxlint sobre todos los archivos modificados: aprobado. El lint global conserva errores previos en componentes UI y hooks ajenos a este cambio.
- Navegador móvil 390 × 844: niveles 1, 5 y 6 completados con teclado, sin golpes, en los frames 563, 765 y 733. No se reclamaron premios ni se publicaron jugadores de prueba.
- Editor: Carrot ajustado de 6.0 a 4.6 mediante arrastre; valor persistido y trayectoria visible.

`npm run courses:audit` regenera el detalle en `outputs/course-quality-report.json`. `courses:verify` impide publicar rutas inválidas, defensas alejadas del recorrido certificado o salas que se ganen sin pulsaciones dentro del horizonte de comprobación.

Para futuras revisiones: `scripts/rebalance-courses.ts`, luego `scripts/repair-pressure.ts`, `scripts/block-autowins.ts` y `npm run courses:verify`. Revisar siempre el informe y jugar las pistas antes de publicar; la certificación por sí sola no garantiza una curva de dificultad satisfactoria.
