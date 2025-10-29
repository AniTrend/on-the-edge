import { describe, it } from '@std/testing/bdd';
import { assert, assertNotStrictEquals, assertStrictEquals } from '@std/assert';
import { tokenOf } from '../inject.util.ts';
import { provide } from './inject.provide.ts';

describe('provide', () => {
  it('binds classes using useClass and reuses their token', () => {
    class Repo {}
    const binding = provide(Repo);
    assert('useClass' in binding);
    assertStrictEquals(binding.useClass, Repo);
    assertStrictEquals(binding.token, tokenOf(Repo));
  });

  it('binds values using useValue with unique tokens per instance', () => {
    const first = { id: 1 };
    const second = { id: 1 };
    const firstBinding = provide(first);
    const secondBinding = provide(second);

    assert('useValue' in firstBinding);
    assert('useValue' in secondBinding);
    assertStrictEquals(firstBinding.useValue, first);
    assertStrictEquals(firstBinding.token, tokenOf(first));
    assertStrictEquals(secondBinding.useValue, second);
    assertStrictEquals(secondBinding.token, tokenOf(second));
    assertNotStrictEquals(firstBinding.token, secondBinding.token);
  });
});
