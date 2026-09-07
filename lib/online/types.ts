import type { Dungeon } from '../game/physics';
import type { VerifiedCourse } from '../game/route-proof';
import type { RaidReplay } from '../game/raid-replay';
export const REVENGE_MS = 24 * 60 * 60 * 1000;
export const MATCH_MS = 10 * 60 * 1000;
export interface Player {
  id: string;
  secretHash: string;
  name: string;
  available: number;
  chest: number;
  active: boolean;
  defense?: VerifiedCourse;
  lock?: string;
  created: number;
  rewards: Record<string, number>;
}
export interface Match {
  id: string;
  attacker: string;
  defender: string;
  kind: 'raid' | 'revenge';
  level: Dungeon;
  counterLevel: Dungeon;
  limit: number;
  created: number;
  expires: number;
  status: 'pending' | 'won' | 'lost' | 'expired' | 'abandoned';
  lootId?: string;
  hp?: number;
  replay?: RaidReplay;
  amount?: number;
}
export interface Loot {
  id: string;
  winner: string;
  victim: string;
  amount: number;
  created: number;
  releaseAt: number;
  status: 'held' | 'released' | 'recovered';
  counterLevel: Dungeon;
  revengeMatch?: string;
  recovered?: number;
}
export interface OnlineState {
  players: Record<string, Player>;
  matches: Record<string, Match>;
  loot: Record<string, Loot>;
}
export const emptyOnlineState = (): OnlineState => ({
  players: {},
  matches: {},
  loot: {},
});
export type OnlineCommand =
  | { action: 'activate'; code: string; amount: number }
  | { action: 'withdraw' }
  | { action: 'match' }
  | { action: 'revenge'; lootId: string }
  | { action: 'finish'; matchId: string; replay: RaidReplay }
  | { action: 'abandon'; matchId: string }
  | { action: 'name'; name: string }
  | {
      action: 'reward';
      course: string;
      kind: 'story' | 'practice';
      replay: RaidReplay;
    };
export interface OnlineView {
  configured: boolean;
  registered: boolean;
  player?: {
    id: string;
    name: string;
    available: number;
    chest: number;
    held: number;
    active: boolean;
    locked: boolean;
  };
  match?: {
    id: string;
    level: Dungeon;
    kind: 'raid' | 'revenge';
    limit: number;
    expires: number;
    opponent: string;
  };
  history?: Array<{
    id: string;
    attacking: boolean;
    hasReplay?: boolean;
    opponent: string;
    status: string;
    amount: number;
    created: number;
    kind: string;
  }>;
  loot?: Array<{
    id: string;
    incoming: boolean;
    amount: number;
    releaseAt: number;
    status: string;
    opponent: string;
    canRevenge: boolean;
    recovered: number;
  }>;
  activePlayers?: number;
  error?: string;
}

export interface MatchReplayView {
  id: string;
  level: Dungeon;
  replay: RaidReplay;
  attacker: string;
  defender: string;
  amount: number;
}
