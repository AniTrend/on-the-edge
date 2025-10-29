import { describe, it } from '@std/testing/bdd';
import {
  assertEquals,
  assertNotStrictEquals,
  assertStrictEquals,
} from '@std/assert';
import { tokenOf } from '../inject.util.ts';

describe('bind', () => {
  it('returns the same token for repeated calls with the same function', () => {
    class Example {}
    const first = tokenOf(Example);
    const second = tokenOf(Example);
    assertStrictEquals(first, second);
  });

  it('returns distinct tokens for distinct object instances', () => {
    const first = {};
    const second = {};
    const firstToken = tokenOf(first);
    const secondToken = tokenOf(second);
    assertNotStrictEquals(firstToken, secondToken);
  });

  it('derives deterministic tokens for symbols', () => {
    const symbol = Symbol('custom');
    const first = tokenOf(symbol);
    const second = tokenOf(symbol);
    assertStrictEquals(first, second);
    assertEquals(typeof first, 'string');
  });

  it('returns provided string tokens verbatim', () => {
    const name = 'todo-repository';
    assertStrictEquals(tokenOf(name), name);
  });
});
