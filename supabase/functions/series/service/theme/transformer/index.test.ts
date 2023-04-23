import { assertEquals } from 'std/testing/asserts';
import { describe, it } from 'std/testing/bdd';
import { ThemeModel } from '../remote/types.d.ts';
import { transform } from './index.ts';
import { Theme } from './types.d.ts';
import { env } from '../../../../_shared/core/env.ts';

describe('theme transformer test', () => {
  const baseUrl: string = env('THEMES');
  it('given theme models return theme collection', () => {
    const given: ThemeModel[] = [
      {
        'malID': 37521,
        'name': 'Vinland Saga',
        'year': 2019,
        'season': 'summer',
        'themes': [
          {
            'themeType': 'OP1',
            'themeName': 'MUKANJYO',
            'mirror': {
              'mirrorURL':
                'https://animethemes.moe/video/VinlandSaga-OP1-NCBD1080.webm',
              'priority': 7,
              'notes': '',
            },
          },
          {
            'themeType': 'OP2',
            'themeName': 'Dark Crow',
            'mirror': {
              'mirrorURL':
                'https://animethemes.moe/video/VinlandSaga-OP2-NCBD1080.webm',
              'priority': 7,
              'notes': '',
            },
          },
          {
            'themeType': 'ED1',
            'themeName': 'Torches',
            'mirror': {
              'mirrorURL':
                'https://animethemes.moe/video/VinlandSaga-ED1-NCBD1080.webm',
              'priority': 7,
              'notes': '',
            },
          },
          {
            'themeType': 'ED2',
            'themeName': 'Drown',
            'mirror': {
              'mirrorURL':
                'https://animethemes.moe/video/VinlandSaga-ED2-NCBD1080.webm',
              'priority': 7,
              'notes': '',
            },
          },
        ],
      },
    ];

    const expected: Theme[] = [
      {
        'id': 'OP1',
        'name': 'MUKANJYO',
        'video': 'https://animethemes.moe/video/VinlandSaga-OP1-NCBD1080.webm',
        'audio': `${baseUrl}/themes/37521/OP1/audio`,
        'meta': {
          'type': 'OP',
          'number': 1,
          'version': 1,
        },
      },
      {
        'id': 'OP2',
        'name': 'Dark Crow',
        'video': 'https://animethemes.moe/video/VinlandSaga-OP2-NCBD1080.webm',
        'audio': `${baseUrl}/themes/37521/OP2/audio`,
        'meta': {
          'type': 'OP',
          'number': 2,
          'version': 1,
        },
      },
      {
        'id': 'ED1',
        'name': 'Torches',
        'video': 'https://animethemes.moe/video/VinlandSaga-ED1-NCBD1080.webm',
        'audio': `${baseUrl}/themes/37521/ED1/audio`,
        'meta': {
          'type': 'ED',
          'number': 1,
          'version': 1,
        },
      },
      {
        'id': 'ED2',
        'name': 'Drown',
        'video': 'https://animethemes.moe/video/VinlandSaga-ED2-NCBD1080.webm',
        'audio': `${baseUrl}/themes/37521/ED2/audio`,
        'meta': {
          'type': 'ED',
          'number': 2,
          'version': 1,
        },
      },
    ];

    const actual = transform(given);

    assertEquals(actual, expected);
  });
});
