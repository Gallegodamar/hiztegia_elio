import { describe, expect, it } from 'vitest';
import { getJSON } from '../../lib/storage';

describe('storage helpers', () => {
  it('getJSON returns default when JSON is corrupted', () => {
    localStorage.setItem('hk:test:broken', '{not-valid-json');

    const result = getJSON('hk:test:broken', { ok: true });

    expect(result).toEqual({ ok: true });
  });
});

