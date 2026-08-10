import { HttpContext } from '@danet/core';
import { ClientContext, RequestAttributes } from '../types/header.types.ts';

export const setRequestAttributes = (
  context: HttpContext,
  attributes: RequestAttributes,
) => {
  context.set('request-attributes', attributes);
};

export const getRequestAttributes = (
  context: HttpContext,
): RequestAttributes => {
  return context.get('request-attributes');
};

export const setClientAttributes = (
  context: HttpContext,
  attributes: ClientContext,
) => {
  context.set('client-attributes', attributes);
};

export const getClientAttributes = (
  context: HttpContext,
): ClientContext => {
  return context.get('client-attributes');
};
