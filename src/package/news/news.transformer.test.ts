import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import type { OtakumodeFeed } from '@scope/service/otakumode';
import { transform } from './news.transformer.ts';

const item = (guid: string, pubDate: number | null) => ({
  title: guid,
  link: `https://example.test/${guid}`,
  description: 'Description',
  'content:encoded': 'Content',
  pubDate,
  guid,
  mainId: guid,
});

describe('news transformer', () => {
  it('drops an invalid date while retaining valid siblings and epoch zero', () => {
    const feed: NonNullable<OtakumodeFeed> = [
      item('invalid', null),
      item('epoch', 0),
      item('recent', 1_700_000_000),
    ];

    const result = transform(feed);

    assertEquals(result.map((news) => news.id), ['epoch', 'recent']);
    assertEquals(result[0].publishedOn, 0);
    assertEquals(result[1].publishedOn, 1_700_000_000);
  });
});
