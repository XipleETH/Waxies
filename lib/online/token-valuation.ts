/**
 * Future token league. No public command accepts token credits yet.
 * The settlement adapter must supply confirmed on-chain balances and trusted
 * server-side quotes. Chispas never enter this valuation.
 */
export const TOKEN_LEAGUE = {
  enabled: false,
  assets: ['SLP', 'AXS', 'RON'] as const,
};
export type VaultToken = (typeof TOKEN_LEAGUE.assets)[number];
export interface TokenBalance {
  asset: VaultToken;
  /** Base units from the confirmed contract deposit, serialized without floats. */
  units: string;
}
export interface UsdQuote {
  asset: VaultToken;
  /** Verified contract decimals, not supplied by a player. */
  decimals: number;
  /** USD per whole token, in millionths of USD. */
  usdMicros: string;
  observedAt: number;
  source: string;
}
export interface TokenChest {
  owner: string;
  /** Immutable reference to a confirmed, finalized deposit ledger revision. */
  depositRevision: string;
  balances: TokenBalance[];
}
const integer = (s: string) => {
  if (typeof s !== 'string' || !/^(0|[1-9][0-9]{0,77})$/.test(s))
    throw Error('Cantidad inválida.');
  return BigInt(s);
};
export function valueChestUsd(
  chest: TokenChest,
  quotes: UsdQuote[],
  now: number,
): bigint {
  if (
    !chest.owner ||
    !chest.depositRevision ||
    chest.balances.length < 1 ||
    chest.balances.length > 3
  )
    throw Error('Falta un depósito confirmado.');
  const seen = new Set<string>();
  let total = BigInt('0');
  for (const balance of chest.balances) {
    if (!TOKEN_LEAGUE.assets.includes(balance.asset) || seen.has(balance.asset))
      throw Error('Activo inválido o duplicado.');
    seen.add(balance.asset);
    const matches = quotes.filter((q) => q.asset === balance.asset);
    if (matches.length !== 1) throw Error('Falta una cotización única.');
    const q = matches[0];
    if (
      !q.source ||
      !Number.isSafeInteger(q.observedAt) ||
      q.observedAt > now ||
      now - q.observedAt > 60000 ||
      !Number.isInteger(q.decimals) ||
      q.decimals < 0 ||
      q.decimals > 36
    )
      throw Error('Cotización inválida o caducada.');
    const price = integer(q.usdMicros);
    if (price <= BigInt('0')) throw Error('Precio inválido.');
    total +=
      (integer(balance.units) * price) / BigInt('10') ** BigInt(q.decimals);
  }
  return total;
}
export function reserveUsdMatch(
  attacker: TokenChest,
  defender: TokenChest,
  quotes: UsdQuote[],
  now: number,
) {
  if (attacker.owner === defender.owner)
    throw Error('No puedes atacar tu propio cofre.');
  const a = valueChestUsd(attacker, quotes, now),
    d = valueChestUsd(defender, quotes, now);
  if (
    a <= BigInt('0') ||
    d <= BigInt('0') ||
    d * BigInt('100') < a * BigInt('90') ||
    d * BigInt('100') > a * BigInt('110')
  )
    return null;
  // Freeze prices and native units together: a future price move must not change an existing wager.
  return structuredClone({
    attacker,
    defender,
    quotes,
    reservedAt: now,
    attackerUsdMicros: a.toString(),
    defenderUsdMicros: d.toString(),
    limitUsdMicros: (a < d ? a : d).toString(),
  });
}
