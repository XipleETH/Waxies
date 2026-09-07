# Online asíncrono — primera beta de Chispas

## Reglas

- Una cuenta invitada por sesión de navegador, identificada con una cookie HttpOnly. No requiere Axie ni billetera. La cuenta recibe 100 Chispas de prueba; borrar la cookie pierde su acceso. No hay recuperación de cuenta todavía.
- Una defensa individual tiene un guardián y de una a cuatro partes diferentes. Hay que completar su disposición exacta sin golpes antes de publicarla. El servidor vuelve a simular su certificado.
- Depositar mueve Chispas disponibles al cofre. Solo una defensa publicada, activa y con cofre positivo habilita incursiones ordinarias. Retirar desactiva la defensa. Editar el borrador no modifica la versión publicada.
- El rival debe tener un cofre entre el 90 % y el 110 % del atacante, ambos inclusive. No se añaden rivales artificiales si no hay jugadores compatibles.
- Cada ataque reserva ambos cofres hasta resolverse o transcurrir diez minutos. No se puede retirar ni cambiar la defensa durante esa reserva. Se congela la geometría de ambos refugios.
- Un golpe reinicia el intento y resta 20 de salud. El botín es `floor(cofre rival × salud final / 100)`. Cinco golpes, abandono o vencimiento no producen botín.
- El botín sale del cofre atacado y queda retenido durante 24 horas. Su ganador no puede depositarlo ni gastarlo todavía.
- La víctima dispone de una sola revancha, incluso si su cofre quedó vacío. Ataca la defensa que tenía el rival al robarle. Recupera como máximo lo perdido, escalado por su salud final. El resto se libera al ganador original, sin cadenas de revanchas.
- Una revancha empezada antes de las 24 horas mantiene la reserva hasta terminar o alcanzar su propio límite de diez minutos. Fallarla o abandonarla consume la oportunidad y libera el botín original.
- Dúos y clanes aparecen como próximos modos; no tienen apuestas ni partidas activas.

## Editor y alcance

Los gestos usan captura de puntero y funcionan con ratón o tacto. Las posiciones se ajustan a las plataformas o al suelo; no se permiten trampas superpuestas ni junto a la entrada o el cofre. Cada cambio invalida el certificado. Los deslizadores permiten ajustes con teclado.

El alcance afecta al simulador: distancia recorrida por proyectiles, ida y vuelta de bumeranes, recorrido de embestidas y radio de espinas o mordidas. Las barreras y apoyos de contacto conservan su cuerpo fijo. Paredes y plataformas siguen limitando los ataques. La línea del editor es una guía del alcance máximo, no garantiza que un proyectil atraviese superficies.

Las 115 configuraciones de Práctica y las 50 de Historia tienen alcances variados y replays sin golpes. `npm run courses:reach` recalcula los alcances y certificados. Los enlaces v3 guardan posición libre y alcance; v1 y v2 siguen siendo compatibles, también con alcances opcionales. Los antiguos retos de dos guardianes siguen siendo enlaces válidos, pero no se publican en Online individual.

## Recompensas y balances de esta beta

El saldo del Bazar sigue guardado en el dispositivo y conserva sus compras. El saldo online es independiente y se registra en el servidor: no se importa un número modificable desde localStorage. Al recoger un premio nuevo en Historia o Práctica, se encola su repetición y se verifica al abrir Online con una cuenta creada.

Historia acredita únicamente mejoras del mejor resultado por pista. Práctica acredita mejoras de la mejor victoria de cada pista por día UTC. Repetir la misma petición no duplica el premio. No hay pagos, depósitos de tokens ni conversión a SLP, AXS, RON, USDC o dinero.

## Servidor y límites técnicos

`/api/online` usa Neon Postgres mediante `@neondatabase/serverless` y requiere `DATABASE_URL` o `POSTGRES_URL`. Sin conexión configurada, la interfaz indica que el servidor está pendiente y permite editar el refugio.

Esta beta usa una fila JSONB versionada con compare-and-swap. Una actualización condicional de revisión hace atómicos los depósitos, reservas, transferencias, liberaciones y resultados idempotentes entre instancias de Vercel. Los conflictos se reintentan; una excepción no persiste cambios. La tabla se crea en el primer acceso. Los vencimientos se liquidan al consultar o ejecutar operaciones, sin cron obligatorio.

Es una implementación para probar con un grupo pequeño: la fila global y los historiales crecientes deben reemplazarse por tablas y transacciones por jugador antes de escalar. Las cuentas invitadas con saldo de bienvenida no evitan multicuentas. No se debe habilitar dinero real con estas reglas de identidad.

El servidor calcula salud y victoria reproduciendo los saltos enviados contra su propia copia de la mazmorra. Rechaza trazas inválidas, categorías desconocidas y resultados ajenos; nunca acepta un importe decidido por el cliente. Sin embargo, una repetición válida demuestra una ruta, no que una persona la haya jugado ni que un cliente manipulado no omita intentos fallidos. Harían falta sesiones de inputs controladas por servidor y protección contra automatización para una economía competitiva con valor real.

## Validación y puesta en marcha

`npm test` cubre colocación, alcances, replays, matchmaking, reservas, conservación del saldo, resultados duplicados, vencimientos y revancha única. `npm run build` vuelve a comprobar las 165 pistas.

Neon quedó aprovisionado y conectado a Vercel tras la aceptación del titular. Se verificó la API contra Postgres con dos sesiones invitadas: publicación, matchmaking, bloqueo del cofre, resultados ajenos, dos resultados concurrentes, botín retenido, revancha única y conservación de Chispas. Se retiraron las cuentas y registros de prueba. La comprobación de origen usa el encabezado Host del navegador porque Next normaliza las direcciones locales.
## Gestos y repeticiones Online

Hay 20 GIF de Axies con genes aleatorios reproducibles, renderizados desde los modelos y partes del Mixer que ya usa el juego. El catálogo (`lib/game/data/emotes.json`) conserva los genes y nombres de las seis partes de cada personaje. Los archivos de `public/assets/emotes/` son GIF de 160 × 160, 24 fotogramas y 2 segundos; sus PNG sirven como miniaturas y alternativa con movimiento reducido. El renderizador de origen está en `scripts/emote-renderer.ts`.

En un ataque Online, el botón de la cara abre los 20 gestos; elegir uno cierra la bandeja. Son cosméticos: no alteran física, salud ni Chispas. Se permite un gesto cada 3 segundos de simulación y hasta 30 por ataque. También puede elegirse un gesto al terminar, antes de confirmar el resultado. Los eventos guardan el índice del intento y el fotograma, incluidos reinicios y golpes.

Al confirmar un ataque ganado o perdido, el servidor valida la simulación y guarda sus entradas, gestos y genes del atacante en el encuentro. «Online → Actividad → Ver repetición» abre el visor 3D para atacante y defensor, con pausa y reinicio. La API `GET /api/online?replay=<id>` exige la sesión de uno de esos participantes. El historial general solo devuelve disponibilidad, no todas las grabaciones. Se conservan las 200 grabaciones más recientes de la beta, sin eliminar movimientos de Chispas ni resultados. Los ataques anteriores a esta función y los abandonados no tienen grabación.

Comprobaciones: `npm test` cubre tiempos, límites, accesos, conservación de Chispas, pausas, reinicios y cinco intentos fallidos; `npm run build` vuelve a certificar las 165 pistas existentes.
