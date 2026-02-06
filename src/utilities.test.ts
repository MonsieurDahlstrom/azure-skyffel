import { expect, test, describe } from 'vitest';

import { cidrHost, cidrSubnet } from './utilities';

describe('cidrHost', () => {
  test('cidrHost expected host with number', () => {
    expect(cidrHost('10.0.0.0/16', 4)).toBe('10.0.0.4');
  });
  test('cidrHost expected host with different number', () => {
    expect(cidrHost('10.0.0.0/16', 5)).toBe('10.0.0.5');
  });
});

describe('cidrSubnet', () => {
  test('cidrSubnet expected host with number', () => {
    expect(cidrSubnet('10.0.0.0/16', 1, 0)).toBe('10.0.0.0/17');
  });
  test('cidrSubnet expected host with number', () => {
    expect(cidrSubnet('10.0.0.0/16', 4, 0)).toBe('10.0.0.0/20');
  });
  test('cidrSubnet expected to error', () => {
    expect(() => cidrSubnet('10.0.0.0/16', 17, 0)).toThrowError(
      /equested 17 new bits, but only 16 are available/,
    );
  });
  test('cidrSubnet expected host with different netnum', () => {
    expect(cidrSubnet('10.0.0.0/16', 1, 1)).toBe('10.0.128.0/17');
  });
});
