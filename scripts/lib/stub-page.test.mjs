import { describe, it, expect } from 'vitest';
import { parseUserType } from './stub-page.mjs';

/**
 * The harness serves four roles and three data shapes, selected by a single
 * string on the command line: `player`, `owner-empty`, `admin-slow`.
 *
 * A typo has to be loud. Parsed by `endsWith` alone — which is how this
 * started — `player-emty` falls through as a *role* named "player-emty", the
 * profile stub serves it as `user_type`, the app matches neither player nor
 * owner, and every audit reports a clean run against a subtly wrong page.
 * That is the same shape as every real finding in this work: a check that says
 * nothing because it never saw the thing, not because the thing was fine.
 */
describe('parseUserType', () => {
  it('reads a bare role', () => {
    for (const role of ['player', 'owner', 'admin', 'anon']) {
      expect(parseUserType(role)).toEqual({ role, mode: null });
    }
  });

  it('reads a role with a data mode', () => {
    expect(parseUserType('player-empty')).toEqual({ role: 'player', mode: 'empty' });
    expect(parseUserType('owner-error')).toEqual({ role: 'owner', mode: 'error' });
    expect(parseUserType('admin-slow')).toEqual({ role: 'admin', mode: 'slow' });
  });

  it('throws on a misspelt mode rather than inventing a role', () => {
    // The case that motivates the whole function.
    expect(() => parseUserType('player-emty')).toThrow(/Unknown user type/);
  });

  it('throws on a misspelt role', () => {
    expect(() => parseUserType('players')).toThrow(/Unknown user type/);
    expect(() => parseUserType('')).toThrow(/Unknown user type/);
  });

  it('throws on a malformed suffix rather than guessing', () => {
    for (const bad of ['player-', '-empty', 'owner-EMPTY']) {
      expect(() => parseUserType(bad)).toThrow(/Unknown user type/);
    }
  });

  it('names what it accepts, so the error is actionable', () => {
    expect(() => parseUserType('nope')).toThrow(/player, owner, admin, anon/);
    expect(() => parseUserType('nope')).toThrow(/-empty, -error, -slow/);
  });
});
