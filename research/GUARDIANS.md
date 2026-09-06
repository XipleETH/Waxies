# Guardianes de mazmorra

Cada guardián se muestra animado en un pedestal al fondo de la sala con el mismo Mixer oficial del jugador. Es decorativo, sin colisión: no altera la ruta certificada. Sus genes dominantes incluyen las partes que producen sus trampas.

## Límites y selección

- Un Axie aporta hasta cuatro poderes: boca, cuerno, espalda y cola. Ojos y orejas siguen siendo cosméticos.
- Dos Axies permiten hasta ocho poderes distintos, como máximo dos de cada tipo de parte. Si dos Axies cargados comparten una carta, esa defensa se coloca una sola vez.
- El editor permite elegir uno o dos guardianes. Cada selector solo ofrece partes de su tipo y del Axie asignado. Sin un Axie cargado se usa el laboratorio, con partes Classic reales y genes sintéticos; no representa un NFT.
- La campaña mantiene 50 niveles y su progresión de una a cinco trampas. Los niveles con cinco usan dos guardianes. El editor permite llegar a ocho.
- Práctica tiene 115 combinaciones certificadas sobre las ocho geometrías anteriores. Cubren las 132 cartas, ahora agrupadas en conjuntos compatibles con un solo Axie.

## Guardado y verificación

`guardianGenes` y `dungeonGuardians` verifican la correspondencia entre genes y cartas. Cada trampa del refugio tiene un `anchor` que identifica su posición y guardián. La física no usa estos metadatos.

El perfil sigue en `waxies.mobile.v1`, con `vaultVersion: 2`. Migrar una antigua defensa de tres trampas conserva Chispas, compras, Axie y resultados de Historia. Ajusta las trampas a cuatro partes compatibles e invalida su certificado: el jugador debe completar de nuevo la defensa sin golpes para compartirla.

Los enlaces nuevos usan el formato v2 con genes, posiciones y repetición. Se rechazan cartas que no pertenecen a los guardianes, posiciones repetidas y pruebas con daño. Los enlaces v1 compatibles siguen abriéndose.

`npm run courses:verify` comprueba rutas y guardianes en cada build. `npx tsx scripts/certify-guardians.ts` normaliza y vuelve a certificar el catálogo de Práctica; `npm run story:generate` hace lo propio con Historia. Solo se escriben los catálogos al completar la verificación.

Las pruebas comprueban las 132 partes contra genes y modelos disponibles, los guardianes de las 165 salas certificadas, la migración y un enlace de ocho trampas con una ruta sin daño de 2562 pasos. Esta prueba demuestra que esa configuración concreta se puede superar; cada edición del usuario requiere su propia validación.
