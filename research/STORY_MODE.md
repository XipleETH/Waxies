# Historia: certificación y dificultad

La campaña contiene 50 niveles numerados en cinco capítulos. Usa las ocho familias de salas existentes con variantes de plataformas y defensas, además de tres salas de aprendizaje sin trampas. Su geometría, sus poderes y sus ciclos permanecen fijos; el Axie visual es aleatorio por entrada. No requiere billetera.

## Cómo certificamos

`route-solver.ts` ejecuta el mismo motor de física a 120 pasos por segundo. Considera saltar o continuar cada 12 pasos (0,1 segundos), descarta estados con daño y conserva un conjunto limitado de candidatos. La búsqueda favorece altura y velocidad ascendente. Práctica intenta anchos de búsqueda de 200 y 450 candidatos; ese número no equivale a intentos humanos. Si no encuentra solución, solo sabemos que esa búsqueda no encontró una: no demuestra imposibilidad.

`generate-story.ts` resuelve los tutoriales y reutiliza secuencias de entrada como propuestas para las variantes. Las vuelve a simular con la geometría y trampas finales; solo acepta las que alcanzan el cofre sin daño. La selección actual se obtuvo de 111 propuestas certificadas. `courses:verify` reproduce las 52 configuraciones de Práctica y los 50 niveles de Historia durante cada build.

## Cómo estimamos dificultad

Para cada ruta se toman hasta 12 saltos repartidos por la secuencia. Se adelanta y retrasa cada uno 6 pasos (50 ms), por separado, y se comprueba si la ruta todavía llega sin daño. Los metadatos guardan ensayos y aciertos, duración, saltos y puntuación.

Puntuación inicial: `50 × (1 − proporción de ensayos superados) + 0,65 × saltos + 0,28 × segundos + 5 × trampas + 2 × plataformas de menos de 3 unidades de ancho`, redondeada. Los niveles se ordenan por esa estimación. Los ensayos no exploran todas las rutas alternativas ni representan un porcentaje de éxito de jugadores. Tampoco garantizan una dificultad estrictamente creciente para cada persona. La siguiente calibración debe usar pruebas humanas: intentos, tiempo hasta superar, puntos de impacto y abandono.

No hacemos que el bot falle artificialmente ni cambiamos la velocidad del jugador. El reto proviene de los recorridos, las defensas y el momento de saltar.

## Progreso y premios

Guardar una victoria desbloquea el siguiente nivel. Una estrella por llegar, dos con al menos 60 de salud y tres con 100. La primera victoria paga la salud restante; repetir solo paga la mejora sobre la mejor marca. Una demostración no guarda resultados, estrellas ni premios. Desde pausa se puede consultar la solución sin premio.

El progreso es local en `waxies.mobile.v1`. Los perfiles anteriores conservan sus compras, saldo, Axie y defensa. Los números publicados de Historia deben mantener su identidad; regenerar/reordenar el catálogo futuro requiere versionar o migrar ese progreso.
