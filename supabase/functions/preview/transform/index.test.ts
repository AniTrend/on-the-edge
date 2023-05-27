import type { OpenGraphInfo } from './types.d.ts';
import { describe, it } from 'std/testing/bdd';

import { assertEquals } from 'std/testing/asserts';
import { transform } from './index.ts';

describe('info transformer test', () => {
  it('given open graph data, transformer should produce custom entity', () => {
    const actual = transform(
      {
        ogTitle: 'Open Graph protocol',
        ogType: 'website',
        ogUrl: 'http://ogp.me/',
        ogDescription:
          'The Open Graph protocol enables any web page to become a rich object in a social graph.',
        ogImage: [{
          url: 'http://ogp.me/logo.png',
          width: 300,
          height: 300,
          type: 'image/png',
        }],
        requestUrl: 'http://ogp.me/',
        success: true,
      },
    );

    const expected: OpenGraphInfo = {
      title: 'Open Graph protocol',
      summary:
        'The Open Graph protocol enables any web page to become a rich object in a social graph.',
      url: 'http://ogp.me/',
      locale: null,
      site: null,
      images: [{
        url: 'http://ogp.me/logo.png',
        width: 300,
        height: 300,
        type: 'image/png',
      }],
    };
    assertEquals(actual, expected);
  });
});
