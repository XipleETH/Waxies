import test from 'node:test';
import assert from 'node:assert/strict';
import { t } from '../lib/i18n/translate';
import {
  resolveLocale,
  setLocale,
  getLocale,
  subscribeLocale,
} from '../lib/i18n/locale';
import { raidPowerDescription } from '../lib/game/raid-powers';
import { PART_LIST } from '../lib/game/catalog';
import courses from '../lib/game/data/story-courses.json';
import { STORY_PANELS } from '../lib/game/story-narrative';
import { EMOTES } from '../lib/game/emotes';

void test('language resolution honors explicit link, saved choice, then browser language', () => {
  assert.equal(resolveLocale('en', 'es', 'es-CO'), 'en');
  assert.equal(resolveLocale(null, 'es', 'en-US'), 'es');
  assert.equal(resolveLocale(null, null, 'es-MX'), 'es');
  assert.equal(resolveLocale('bad', 'bad', 'fr-FR'), 'en');
});
void test('translation preserves whitespace, React values, Spanish text and unknown names', () => {
  assert.equal(t(' Historia ', 'en'), ' Story ');
  assert.equal(t('Historia', 'es'), 'Historia');
  assert.equal(t('  Custom   player  ', 'en'), '  Custom   player  ');
  const object = { part: 'carrot', name: 'Historia' };
  assert.equal(t(object, 'en'), object);
  assert.equal(t(undefined, 'en'), undefined);
  assert.equal(t(100, 'en'), 100);
});
void test('dynamic labels translate numbers and preserve official Axie part names', () => {
  assert.equal(t('Historia 4 de 50', 'en'), 'Story 4 of 50');
  assert.equal(t('Cómo esquivar Carrot', 'en'), 'How to dodge Carrot');
  assert.equal(
    t('Nivel 4, bloqueado, 0 Chispas recogidas, 100 por recoger', 'en'),
    'Level 4, locked, 0 Sparks collected, 100 remaining',
  );
  assert.equal(
    t('100 Chispas, 3 estrellas, guardado', 'en'),
    '100 Sparks, 3 stars, saved',
  );
  assert.equal(t('Radio orbital: 2.5', 'en'), 'Orbit radius: 2.5');
});
void test('catalog, story and emotes have English presentation without mutating saved levels', () => {
  const before = JSON.stringify(courses);
  setLocale('en');
  for (const course of courses)
    assert.notEqual(t(course.level.name), course.level.name);
  for (const panel of STORY_PANELS) {
    assert.notEqual(t(panel.title), panel.title);
    assert.notEqual(t(panel.text), panel.text);
  }
  for (const emote of EMOTES)
    if (emote.name !== 'Oops') assert.notEqual(t(emote.name), emote.name);
  for (const part of PART_LIST) {
    const en = raidPowerDescription(part.id);
    setLocale('es');
    const es = raidPowerDescription(part.id);
    setLocale('en');
    assert.notEqual(en, es, part.id);
    assert.ok(en.includes('original Classic card'), part.id);
  }
  assert.equal(JSON.stringify(courses), before);
});
void test('locale subscriptions update only on changes and can be disposed', () => {
  setLocale('en');
  let calls = 0;
  const dispose = subscribeLocale(() => calls++);
  setLocale('es');
  setLocale('es');
  assert.equal(getLocale(), 'es');
  assert.equal(calls, 1);
  dispose();
  setLocale('en');
  assert.equal(calls, 1);
});

void test('revenge timers and settlement amounts translate complete messages', () => {
  assert.equal(
    t('Revancha disponible hasta 9/22/2026, 2:00 PM', 'en'),
    'Revenge available until 9/22/2026, 2:00 PM',
  );
  assert.equal(
    t('Al defensor: 80 · Al atacante: 20', 'en'),
    'To the defender: 80 · To the attacker: 20',
  );
  assert.equal(t('Carrot te alcanzó', 'en'), 'Carrot hit you');
});
