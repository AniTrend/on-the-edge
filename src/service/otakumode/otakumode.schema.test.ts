import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { RssSchema } from './otakumode.schema.ts';

const item = (overrides: Record<string, unknown> = {}) => ({
  title: 'News',
  link: 'https://example.test/news',
  description: 'Description',
  'content:encoded': 'Content',
  pubDate: 'Thu, 01 Jan 1970 00:00:00 GMT',
  guid: 'news-1',
  mainId: 'news-1',
  ...overrides,
});

const channel = (overrides: Record<string, unknown> = {}) => ({
  title: 'News feed',
  link: 'https://example.test/',
  description: 'Feed description',
  author: 'Publisher',
  language: 'en',
  'atom:link': {
    'xmlns:atom': 'https://www.w3.org/2005/Atom',
    rel: 'self',
    href: 'https://example.test/feed',
    type: 'application/rss+xml',
  },
  ...overrides,
});

const parseChannel = (overrides: Record<string, unknown> = {}) =>
  RssSchema.parse({ rss: { channel: channel(overrides) } }).rss.channel;

describe('RssSchema', () => {
  it('normalizes an absent item to an empty array', () => {
    assertEquals(parseChannel().item, []);
  });

  it('normalizes a singleton item object to an array', () => {
    const result = parseChannel({ item: item() });
    assertEquals(result.item.length, 1);
    assertEquals(result.item[0].pubDate, 0);
  });

  it('preserves an item array', () => {
    assertEquals(
      parseChannel({ item: [item(), item({ guid: 'news-2' })] })
        .item.length,
      2,
    );
  });

  it('rejects primitive and malformed item containers', () => {
    assertEquals(
      RssSchema.safeParse({ rss: { channel: channel({ item: 1 }) } })
        .success,
      false,
    );
    assertEquals(
      RssSchema.safeParse({
        rss: { channel: channel({ item: { unexpected: 1 } }) },
      })
        .success,
      false,
    );
    assertEquals(
      RssSchema.safeParse({ rss: { channel: channel({ item: null }) } })
        .success,
      false,
    );
  });

  it('normalizes empty and invalid publication dates to null', () => {
    assertEquals(
      parseChannel({ item: item({ pubDate: '' }) }).item[0].pubDate,
      null,
    );
    assertEquals(
      parseChannel({ item: item({ pubDate: 'not a date' }) }).item[0].pubDate,
      null,
    );
  });

  it('requires publication date strings', () => {
    assertEquals(
      RssSchema.safeParse({
        rss: { channel: channel({ item: item({ pubDate: undefined }) }) },
      }).success,
      false,
    );
    assertEquals(
      RssSchema.safeParse({
        rss: { channel: channel({ item: item({ pubDate: 0 }) }) },
      }).success,
      false,
    );
  });

  it('preserves epoch zero as a finite publication date', () => {
    assertEquals(parseChannel({ item: item() }).item[0].pubDate, 0);
  });

  it('normalizes finite and invalid optional dimensions', () => {
    const mediaContent = {
      url: 'https://example.test/image.png',
      width: '1280',
      height: '  ',
    };
    const valid = parseChannel({
      item: item({ 'media:content': mediaContent }),
    }).item[0]['media:content'];
    assertEquals(valid?.width, 1280);
    assertEquals(valid?.height, undefined);

    const invalid = parseChannel({
      item: item({
        'media:content': {
          ...mediaContent,
          width: '',
          height: 'Infinity',
        },
      }),
    }).item[0]['media:content'];
    assertEquals(invalid?.width, undefined);
    assertEquals(invalid?.height, undefined);

    const malformed = parseChannel({
      item: item({
        'media:content': {
          ...mediaContent,
          width: 'not-a-number',
        },
      }),
    }).item[0]['media:content'];
    assertEquals(malformed?.width, undefined);
  });

  it('rejects non-string dimension input', () => {
    assertEquals(
      RssSchema.safeParse({
        rss: {
          channel: channel({
            item: item({
              'media:content': {
                url: 'https://example.test/image.png',
                width: 10,
              },
            }),
          }),
        },
      }).success,
      false,
    );
  });
});
