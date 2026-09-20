import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOKEN_LEAGUE,
  valueChestUsd,
  reserveUsdMatch,
  type TokenChest,
  type UsdQuote,
} from '../lib/online/token-valuation';
const quotes: UsdQuote[] = [
  {
    asset: 'SLP',
    decimals: 0,
    usdMicros: '2000',
    observedAt: 100,
    source: 'test-only',
  },
  {
    asset: 'AXS',
    decimals: 18,
    usdMicros: '5000000',
    observedAt: 100,
    source: 'test-only',
  },
  {
    asset: 'RON',
    decimals: 18,
    usdMicros: '1000000',
    observedAt: 100,
    source: 'test-only',
  },
];
const a: TokenChest = {
  owner: 'a',
  depositRevision: 'confirmed-1',
  balances: [{ asset: 'SLP', units: '5000' }],
};
const b: TokenChest = {
  owner: 'b',
  depositRevision: 'confirmed-2',
  balances: [{ asset: 'AXS', units: '2000000000000000000' }],
};
test('equal dollar chests match across token types and freeze valuation', () => {
  assert.equal(TOKEN_LEAGUE.enabled, false);
  assert.equal(valueChestUsd(a, quotes, 100), BigInt('10000000'));
  const match = reserveUsdMatch(a, b, quotes, 100)!;
  assert.equal(match.limitUsdMicros, '10000000');
  match.quotes[0].usdMicros = '1';
  assert.equal(quotes[0].usdMicros, '2000');
  const c: TokenChest = {
    ...b,
    balances: [{ asset: 'RON', units: '10000000000000000000' }],
  };
  assert.ok(reserveUsdMatch(a, c, quotes, 100));
});
test('missing, stale, future, duplicate prices and unsupported or unfunded assets fail closed', () => {
  assert.throws(() => valueChestUsd(a, [], 100));
  assert.throws(() => valueChestUsd(a, quotes, 60101));
  assert.throws(() => valueChestUsd(a, quotes, 99));
  assert.throws(() => valueChestUsd(a, [...quotes, quotes[0]], 100));
  assert.throws(() =>
    valueChestUsd({ ...a, depositRevision: '' }, quotes, 100),
  );
  assert.throws(() =>
    valueChestUsd(
      { ...a, balances: [{ asset: 'SLP', units: '1.5' }] },
      quotes,
      100,
    ),
  );
  assert.equal(
    reserveUsdMatch(
      a,
      { ...b, balances: [{ asset: 'AXS', units: '10000000000000000000' }] },
      quotes,
      100,
    ),
    null,
  );
  assert.throws(() => reserveUsdMatch(a, a, quotes, 100));
});
test('USD tolerance boundaries and large base-unit amounts use integer arithmetic', () => {
  const c = (units: string): TokenChest => ({
    ...b,
    balances: [{ asset: 'SLP', units }],
  });
  assert.ok(reserveUsdMatch(a, c('4500'), quotes, 100));
  assert.ok(reserveUsdMatch(a, c('5500'), quotes, 100));
  assert.equal(reserveUsdMatch(a, c('4499'), quotes, 100), null);
  assert.equal(reserveUsdMatch(a, c('5501'), quotes, 100), null);
  assert.equal(
    valueChestUsd(c('9007199254740993'), quotes, 100),
    BigInt('18014398509481986000'),
  );
});
