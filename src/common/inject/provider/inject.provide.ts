import {
  InjectableConstructor,
  UseClassInjector,
  UseValueInjector,
} from '@danet/core';
import { IBindable } from '../binder/inject.bind.ts';
import { tokenOf } from '../inject.util.ts';

export type IProvider = UseValueInjector | UseClassInjector;

export const provide = <T extends IBindable>(provider: T): IProvider => {
  if (typeof provider === 'function') {
    return {
      useClass: provider as InjectableConstructor,
      token: tokenOf(provider),
    };
  }
  return { useValue: provider, token: tokenOf(provider) };
};
