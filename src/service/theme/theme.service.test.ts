import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { mockFetch, resetFetch } from '@c4spar/mock-fetch';
import { ThemeService } from '@scope/service/theme';
import { createMockLogger, createMockSecret } from '@scope/common/testing';

describe('ThemeService', () => {
  const config = createMockSecret({
    THEMES: 'https://themes.test',
    CLIENT_REQUEST_TIMEOUT: '5000',
  }).service;
  const { logger } = createMockLogger();

  beforeEach(() => {
    resetFetch();
  });

  afterEach(() => {
    resetFetch();
  });

  it('fetches and transforms themes', async () => {
    const payload = [
      {
        malID: 37521,
        name: 'Vinland Saga',
        year: 2019,
        season: 'summer',
        themes: [
          {
            themeType: 'OP1',
            themeName: 'MUKANJYO',
            mirror: {
              mirrorURL: 'https://animethemes.moe/video/VinlandSaga-OP1.webm',
              priority: 7,
              notes: '',
            },
          },
          {
            themeType: 'ED1',
            themeName: 'Torches',
            mirror: {
              mirrorURL: 'https://animethemes.moe/video/VinlandSaga-ED1.webm',
              priority: 2,
              notes: '',
            },
          },
        ],
      },
    ];

    mockFetch('https://themes.test/api/themes/37521', {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const service = new ThemeService(config, logger);
    const result = await service.getThemesForAnime(37521);

    assertEquals(result?.length, 2);
    const opTheme = result?.find((theme) => theme.id === 'OP1');
    const edTheme = result?.find((theme) => theme.id === 'ED1');
    assertEquals(
      opTheme?.audio,
      'https://themes.test/themes/37521/OP1/audio',
    );
    assertEquals(edTheme?.meta.type, 'ED');
  });
});
