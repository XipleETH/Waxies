import type { VerifiedCourse } from '../lib/game/route-proof';
import type { routePressure } from '../lib/game/route-pressure';
import type { metrics } from './story-certification';
export type AuthoredCourse = VerifiedCourse & {
  number?: number;
  chapter?: number;
  traversal?: string;
  metrics?: ReturnType<typeof metrics>;
  pressure?: Omit<ReturnType<typeof routePressure>, 'trace'>;
};
