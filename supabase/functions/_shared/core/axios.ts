import { axiod } from 'x/axiod';
import { IRequest } from 'x/axiod/interfaces';

export const defaults: IRequest = {
  ...axiod.defaults,
  timeout: 5000,
  headers: {
    'accept': 'application/json',
    'accept-encoding': 'gzip, deflate, br',
  },
};

export const axios = axiod.create(defaults);
