import { readFileSync, writeFileSync } from 'node:fs';
import { PARTS } from '../lib/game/catalog';
import { raidFamily } from '../lib/game/raid-mechanics';
import { reachSettings } from '../lib/game/trap-reach';
import { replay, metrics } from './story-certification';
import { routePressure } from '../lib/game/route-pressure';
import { descentBypass, descends } from './descent-certification';
import { dungeonGuardians } from '../lib/game/guardians';
const path = 'lib/game/data/story-courses.json',
  story = JSON.parse(readFileSync(path, 'utf8'));
for (const part of [
  'indian-star',
  'gerbil',
  'shoal-star',
  'hot-butt',
  'dual-blade',
]) {
  let count = story
    .flatMap((c: any) => c.level.traps)
    .filter((t: any) => t.part === part).length;
  if (count >= 2) continue;
  outer: for (const c of story.filter((c: any) => c.number >= 8)) {
    if (c.level.traps.some((t: any) => t.part === part)) continue;
    for (let i = 0; i < c.level.traps.length; i++) {
      const old = c.level.traps[i];
      if (
        ['indian-star', 'gerbil', 'shoal-star', 'hot-butt'].includes(old.part)
      )
        continue;
      if (PARTS[old.part].slotId !== PARTS[part].slotId) continue;
      const r = reachSettings(part);
      for (const reach of [r.default, r.min + (r.max - r.min) * 0.35, r.min]) {
        c.level.traps[i] = { ...old, part, reach };
        const proof = replay(c.level, c.proof.actions, c.proof.frames + 120);
        if (
          proof &&
          routePressure(c.level, proof).encountered === c.level.traps.length &&
          (!descends(c.level) || !descentBypass(c.level))
        ) {
          dungeonGuardians(c.level);
          c.proof = proof;
          c.metrics = metrics(c.level, proof);
          count++;
          console.log(c.number, raidFamily(part));
          if (count >= 2) break outer;
          break;
        }
        c.level.traps[i] = old;
      }
      if (c.level.traps[i].part === part) break;
    }
  }
  if (count < 1) throw Error('No teaching course ' + part);
}
writeFileSync(path, JSON.stringify(story, null, 2) + String.fromCharCode(10));
