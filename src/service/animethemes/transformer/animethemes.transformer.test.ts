import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { transformAnimeThemes } from './index.ts';
import type { AnimeThemesAnimeModel } from '../animethemes.types.ts';

describe('AnimeThemes transformer', () => {
  it('flattens one item per entry and prefers creditless higher resolution videos', () => {
    const anime: AnimeThemesAnimeModel = {
      id: 1,
      name: 'Vinland Saga',
      slug: 'vinland-saga',
      year: 2019,
      season: 'Summer',
      media_format: 'TV',
      animethemes: [
        {
          id: 12,
          type: 'ED',
          sequence: 1,
          slug: 'vinland-saga-ed1',
          song: { id: 22, title: 'Torches' },
          animethemeentries: [
            {
              id: 32,
              version: 1,
              episodes: null,
              nsfw: false,
              spoiler: false,
              notes: null,
              videos: [
                {
                  id: 43,
                  link: 'https://animethemes.moe/video/VinlandSaga-ED1.webm',
                  resolution: 720,
                  nc: false,
                  subbed: false,
                  lyrics: false,
                  uncen: false,
                  source: 'WEB',
                  overlap: 'None',
                  tags: '',
                  audio: {
                    id: 53,
                    link: 'https://animethemes.moe/audio/ED1.ogg',
                  },
                },
              ],
            },
          ],
        },
        {
          id: 11,
          type: 'OP',
          sequence: 1,
          slug: 'vinland-saga-op1',
          song: { id: 21, title: 'MUKANJYO' },
          animethemeentries: [
            {
              id: 31,
              version: 2,
              episodes: null,
              nsfw: false,
              spoiler: false,
              notes: null,
              videos: [
                {
                  id: 41,
                  link:
                    'https://animethemes.moe/video/VinlandSaga-OP1-v2-720.webm',
                  resolution: 720,
                  nc: false,
                  subbed: false,
                  lyrics: false,
                  uncen: false,
                  source: 'WEB',
                  overlap: 'None',
                  tags: '',
                  audio: null,
                },
                {
                  id: 42,
                  link:
                    'https://animethemes.moe/video/VinlandSaga-OP1-v2-1080-nc.webm',
                  resolution: 1080,
                  nc: true,
                  subbed: false,
                  lyrics: false,
                  uncen: false,
                  source: 'BD',
                  overlap: 'None',
                  tags: '',
                  audio: {
                    id: 52,
                    link: 'https://animethemes.moe/audio/OP1-v2.ogg',
                  },
                },
              ],
            },
            {
              id: 30,
              version: 1,
              episodes: null,
              nsfw: false,
              spoiler: false,
              notes: null,
              videos: [
                {
                  id: 40,
                  link: 'https://animethemes.moe/video/VinlandSaga-OP1.webm',
                  resolution: 1080,
                  nc: false,
                  subbed: false,
                  lyrics: false,
                  uncen: false,
                  source: 'WEB',
                  overlap: 'None',
                  tags: '',
                  audio: null,
                },
              ],
            },
          ],
        },
      ],
    };

    assertEquals(transformAnimeThemes(anime), [
      {
        id: 'OP1',
        name: 'MUKANJYO',
        video: 'https://animethemes.moe/video/VinlandSaga-OP1.webm',
        audio: null,
        meta: {
          type: 'OP',
          number: 1,
          version: 1,
        },
      },
      {
        id: 'OP1 V2',
        name: 'MUKANJYO',
        video: 'https://animethemes.moe/video/VinlandSaga-OP1-v2-1080-nc.webm',
        audio: 'https://animethemes.moe/audio/OP1-v2.ogg',
        meta: {
          type: 'OP',
          number: 1,
          version: 2,
        },
      },
      {
        id: 'ED1',
        name: 'Torches',
        video: 'https://animethemes.moe/video/VinlandSaga-ED1.webm',
        audio: 'https://animethemes.moe/audio/ED1.ogg',
        meta: {
          type: 'ED',
          number: 1,
          version: 1,
        },
      },
    ]);
  });

  it('falls back to the generated id when song metadata is missing and skips entries without videos', () => {
    const anime: AnimeThemesAnimeModel = {
      id: 2,
      name: 'Test',
      slug: 'test',
      year: null,
      season: null,
      media_format: null,
      animethemes: [
        {
          id: 20,
          type: 'OP',
          sequence: 2,
          slug: 'test-op2',
          song: null,
          animethemeentries: [
            {
              id: 60,
              version: 1,
              episodes: null,
              nsfw: false,
              spoiler: false,
              notes: null,
              videos: [],
            },
            {
              id: 61,
              version: 2,
              episodes: null,
              nsfw: false,
              spoiler: false,
              notes: null,
              videos: [
                {
                  id: 70,
                  link: 'https://animethemes.moe/video/Test-OP2-v2.webm',
                  resolution: null,
                  nc: false,
                  subbed: false,
                  lyrics: false,
                  uncen: false,
                  source: null,
                  overlap: null,
                  tags: null,
                  audio: null,
                },
              ],
            },
          ],
        },
      ],
    };

    assertEquals(transformAnimeThemes(anime), [
      {
        id: 'OP2 V2',
        name: 'OP2 V2',
        video: 'https://animethemes.moe/video/Test-OP2-v2.webm',
        audio: null,
        meta: {
          type: 'OP',
          number: 2,
          version: 2,
        },
      },
    ]);
  });
});
