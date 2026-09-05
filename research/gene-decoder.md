# Verified 512-bit Axie dominant-gene mapping

Use the public official metadata endpoint's genes string. Parse as BigInt hexadecimal and left-pad logically to 512 bits. Do not convert it to a JavaScript Number. Leading zeroes may be omitted: Axie 27 is a valid shorter hex representation.

Bit positions below are zero-based from the most significant (leftmost) bit of the 512-bit value. The header occupies 128 bits. Six 64-bit part blocks follow, in this exact order:

0 eyes; 1 mouth; 2 ears; 3 horn; 4 back; 5 tail.

For a slot index i, start = 128 + 64*i.

| Field | Relative start | Width |
|---|---:|---:|
| Reservation | 0 | 12 |
| Stage | 12 | 3 |
| Skin inheritability | 15 | 1 |
| Cosmetic skin | 16 | 9 |
| Dominant class | 25 | 5 |
| Dominant part value | 30 | 8 |
| Recessive 1 class | 38 | 5 |
| Recessive 1 part value | 43 | 8 |
| Recessive 2 class | 51 | 5 |
| Recessive 2 part value | 56 | 8 |

Extraction: Number((genes >> BigInt(512 - start - relativeOffset - width)) & ((1n << BigInt(width)) - 1n)).

Class codes: 0 beast, 1 bug, 2 bird, 3 plant, 4 aquatic, 5 reptile, 16 mech, 17 dawn, 18 dusk. Use the part's dominant class, never the body class. The latter can differ for mixed Axies.

For mouth/horn/back/tail, form class-slot-dominantValue with value padded to at least two decimal digits. Accept the candidate ONLY if it is in the verified 132 level-1 card ID set. Eyes and ears return no battle card. Unknown class/value combinations and absent catalog records return null; do not substitute a guessed card. Cosmetic skin and current stage are independent fields and are not part of the normalized level-1 card key.

## Fixture results

Official metadata: https://metadata.axieinfinity.com/axie/4200042

| Slot | Official metadata name | Dominant class/value | Base Classic card |
|---|---|---|---|
| mouth | Risky Fish | aquatic / 8 | aquatic-mouth-08; Fish Hook |
| horn | Oranda | aquatic / 10 | aquatic-horn-10; Hero's Bane |
| back | Goldfish | aquatic / 6 | aquatic-back-06; Swift Escape |
| tail | Nimo | aquatic / 4 | aquatic-tail-04; Tail Slap |

Official metadata: https://metadata.axieinfinity.com/axie/27

| Slot | Official metadata name | Skin / stage | Dominant class/value | Base Classic card |
|---|---|---|---|---|
| mouth | Bottom Dweller Shiny | 13 / 1 | aquatic / 4 | aquatic-mouth-04; Catfish; Swallow |
| horn | Unko | 0 / 1 | reptile / 2 | reptile-horn-02; Poo Fling |
| back | Hasagi | 1 / 1 | beast / 2 | beast-back-02; Ronin; Single Combat |
| tail | Shiba | 0 / 1 | beast / 6 | beast-tail-06; Rampant Howl |

The modern mouth metadata ID is mouth-bottom-dweller-shiny-2, with skin name NightmareShiny. Its base mapping was obtained from the gene bits, not inferred from its name. Both fixture Axies' six stage values match the metadata (12/12), and all eight battle card IDs resolve to verified official catalog records. Zero-padding variations and unsupported-input behavior were also checked.

## Official source evidence

- Layout and current stage field: https://github.com/axieinfinity/unity-axie-mixer3d/blob/63ec82afc7deeec242734e70fea4bb9fffa904cc/Packages/com.skymavis.axiemixer3d/Runtime/AxieDescriptor.cs
- Independent older decoder with the same dominant class/value offsets: https://github.com/axieinfinity/cc-axie-gtk2d/blob/1a446848bff0061334f32dcbd8f69ab9d36987b0/assets/axie-mixer/src/core/common/genes/GenesParser.ts
- Official slot order and class code mapping: https://github.com/axieinfinity/cc-axie-gtk2d/blob/1a446848bff0061334f32dcbd8f69ab9d36987b0/assets/axie-mixer/src/core/common/genes/BodyStructure.ts
- Official mixer resolves dominant class/slot/value first, then selects the cosmetic skin: https://github.com/axieinfinity/cc-axie-gtk2d/blob/1a446848bff0061334f32dcbd8f69ab9d36987b0/assets/axie-mixer/src/core/common/genes/GenesStuff.ts

The 2023 TypeScript parser's stage field is outdated: it reads two leading bits of each block. The current official 3D mixer reads stage at relative offset 12 with width 3, matching both live fixtures. Dominant identity offsets agree in both versions.

## Files and limits

- decode-genes-512.mjs: small helper; requires the caller's verified base-card ID Set.
- test-decoder.mjs: bounded fixture/validation checks; run with Node.
- verified-results.json: complete decoded fixtures and name/catalog joins.
- 4200042.json and 27.json: public official metadata snapshots.
- *.source.* and sources.json: pinned official source code and links.

This resolves underlying normalized Classic card identity. It does not supply artwork for newer cosmetic skins and does not establish every future skin's name. Preserve official metadata names/IDs for display; keep the base-card identity separate. It does not infer or convert legacy 256-bit genes: use the official 512-bit metadata field only.