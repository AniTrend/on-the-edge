import { env } from '../../../common/core/env.ts';
import { request } from '../../../common/core/request.ts';
import { Service } from '../../../common/types/state.ts';
import { TheXemDataModel } from './types.ts';

const getService = (): Service => ({
  url: env<string>('THEXEM'),
  credential: {},
});

// Fetch TheXEM mappings by TVDB ID.
// Note: The exact endpoint path may vary by deployment. We default to a common pattern and
// allow overriding THEXEM to point at a compatible proxy. Consumers should wrap in try/catch.
export const getTheXemByTvdb = async (
  tvdbId: number,
): Promise<TheXemDataModel> => {
  const service = getService();
  // Common TheXEM proxy convention: /map/all?origin=tvdb&id=<id>
  // If your endpoint differs, set THEXEM accordingly (including full path),
  // e.g., https://thexem.example.com/map/all?origin=tvdb&id=12345
  const base = service.url.replace(/\/$/, '');
  const url = `${base}/map/all?origin=tvdb&id=${tvdbId}`;
  return await request(url);
};
