import { Inject, InjectableConstructor } from '@danet/core';
import { tokenOf } from '../inject.util.ts';

export type IBindable = InjectableConstructor | unknown;

export const Bind = (identifier: unknown) => Inject(tokenOf(identifier));
