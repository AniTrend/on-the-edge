import { assertEquals } from 'std/testing/asserts';
import { fromModel } from './mapper.ts';

Deno.test('Maaper test', () => {
  const given = [
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

  const expected = [
    {
      'id': 'OP1',
      'name': 'MUKANJYO',
      'video': 'https://animethemes.moe/video/VinlandSaga-OP1-NCBD1080.webm',
      'audio': 'https://themes.moe/api/themes/37521/OP1/audio',
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
      'audio': 'https://themes.moe/api/themes/37521/OP2/audio',
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
      'audio': 'https://themes.moe/api/themes/37521/ED1/audio',
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
      'audio': 'https://themes.moe/api/themes/37521/ED2/audio',
      'meta': {
        'type': 'ED',
        'number': 2,
        'version': 1,
      },
    },
  ];

  const actual = fromModel(given, 'https://themes.moe/api/themes/37521');

  assertEquals(actual, expected);
});
