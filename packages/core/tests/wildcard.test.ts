import { describe, it, expect, beforeEach } from 'vitest';
import { WildcardMatcher } from '../src/WildcardMatcher';

describe('WildcardMatcher', () => {
  let matcher: WildcardMatcher;

  beforeEach(() => {
    matcher = new WildcardMatcher();
  });

  it('should match direct exact strings without wildcard', () => {
    expect(matcher.match('user.create', 'user.create')).toBe(true);
    expect(matcher.match('user.create', 'user.delete')).toBe(false);
  });

  it('should match using global wildcard *', () => {
    expect(matcher.match('*', 'user.create')).toBe(true);
    expect(matcher.match('*', 'patient.view')).toBe(true);
    expect(matcher.match('*', 'invoice.delete')).toBe(true);
  });

  it('should match using prefix wildcards like patient.*', () => {
    expect(matcher.match('patient.*', 'patient.view')).toBe(true);
    expect(matcher.match('patient.*', 'patient.create')).toBe(true);
    expect(matcher.match('patient.*', 'user.create')).toBe(false);
  });

  it('should match deep nested suffixes correctly', () => {
    expect(matcher.match('user.*', 'user.profile.view')).toBe(true);
  });

  it('should not match if suffix is not matching prefix', () => {
    expect(matcher.match('patient.*', 'patiently.view')).toBe(false);
  });
});
