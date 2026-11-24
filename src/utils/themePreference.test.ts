import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getNextThemePreference,
  isValidThemePreference,
  normalizeThemePreference,
} from './themePreference';

test('normalizeThemePreference defaults to light for missing or invalid values', () => {
  assert.equal(normalizeThemePreference(undefined), 'light');
  assert.equal(normalizeThemePreference(null), 'light');
  assert.equal(normalizeThemePreference(''), 'light');
  assert.equal(normalizeThemePreference('system'), 'light');
  assert.equal(normalizeThemePreference('DARK'), 'light');
  assert.equal(normalizeThemePreference(123), 'light');
});

test('normalizeThemePreference preserves valid light and dark values', () => {
  assert.equal(normalizeThemePreference('light'), 'light');
  assert.equal(normalizeThemePreference('dark'), 'dark');
});

test('isValidThemePreference strictly validates light and dark strings', () => {
  assert.equal(isValidThemePreference('light'), true);
  assert.equal(isValidThemePreference('dark'), true);
  assert.equal(isValidThemePreference('auto'), false);
  assert.equal(isValidThemePreference(null), false);
});

test('getNextThemePreference toggles cleanly between light and dark', () => {
  assert.equal(getNextThemePreference('light'), 'dark');
  assert.equal(getNextThemePreference('dark'), 'light');
});
