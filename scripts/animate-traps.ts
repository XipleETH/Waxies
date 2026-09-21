import { moveTrap } from '../lib/game/trap-motion';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { verifyRoute, type VerifiedCourse } from '../lib/game/route-proof';
import { raidFamily, MOVING_FAMILIES } from '../lib/game/raid-mechanics';
import { routePressure } from '../lib/game/route-pressure';
import { descends, descentBypass } from './descent-certification';
import { validFreeTraps, snapTrap } from '../lib/game/free-vault';
import type { Trap } from '../lib/game/physics';
const out = 'output/moving-traps-final';
mkdirSync(out, { recursive: true });
for (const name of ['story-courses', 'verified-courses', 'starter-vaults']) {
  const courses = JSON.parse(
    readFileSync(
      `${process.argv.includes('--continue') ? out : 'lib/game/data'}/${name}.json`,
      'utf8',
    ),
  ) as VerifiedCourse[];
  const failures: string[] = [];
  for (const c of courses) {
    for (let i = 0; i < c.level.traps.length; i++) {
      const old = c.level.traps[i],
        family = raidFamily(old.part);
      const travels = (trap: Trap) => {
        if (!trap.motion) return false;
        const current = { x: trap.x, y: trap.y };
        let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity;
        for (let f = 0; f < 720; f++) {
          moveTrap(trap, current, f / 120, c.level);
          if (f > 120) {
            minX = Math.min(minX, current.x);
            maxX = Math.max(maxX, current.x);
            minY = Math.min(minY, current.y);
            maxY = Math.max(maxY, current.y);
          }
        }
        return Math.hypot(maxX - minX, maxY - minY) > 0.15;
      };
      const encountered =
        name === 'starter-vaults' ||
        routePressure(c.level, c.proof).closest[i] < 1;
      if (
        encountered &&
        ((old.motion && travels(old)) ||
          (!old.motion && MOVING_FAMILIES.has(family)))
      )
        continue;
      let found = false;
      search: for (const dy of [0, -0.4, 0.4, -0.8, 0.8])
        for (const dx of [0, -0.4, 0.4, -0.8, 0.8])
          for (const motion of ['bounce', 'diagonal', 'flight'] as const)
            for (const motionRange of motion === 'bounce'
              ? [0.8, 0.5, 0.35]
              : [2, 1, 0.5])
              for (let phase = 0; phase < 8; phase++)
                for (const motionDirection of [1, -1] as const) {
                  const candidate: Trap = {
                    ...old,
                    x: old.x + dx,
                    y: old.y + dy,
                    motion,
                    motionRange,
                    motionDirection,
                    motionPhase: (phase * Math.PI) / 4,
                  };
                  if (c.level.freePlacement)
                    Object.assign(
                      candidate,
                      snapTrap(candidate.x, candidate.y),
                    );
                  c.level.traps[i] = candidate;
                  if (c.level.freePlacement && !validFreeTraps(c.level.traps))
                    continue;
                  if (!travels(candidate)) continue;
                  if (!verifyRoute(c.level, c.proof)) continue;
                  if (name !== 'starter-vaults') {
                    const p = routePressure(c.level, c.proof);
                    if (
                      p.encountered !== p.total ||
                      (descends(c.level) && descentBypass(c.level))
                    )
                      continue;
                  }
                  found = true;
                  break search;
                }
      if (!found) {
        c.level.traps[i] = old;
        failures.push(`${c.level.id}:${old.part}`);
      } else console.log('animated', c.level.id, old.part);
    }
  }
  writeFileSync(`${out}/${name}.json`, JSON.stringify(courses, null, 2) + '\n');
  console.log(JSON.stringify({ name, failures }));
  if (failures.length) process.exitCode = 1;
}
