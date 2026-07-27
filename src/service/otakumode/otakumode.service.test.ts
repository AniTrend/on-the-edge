import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals, assertObjectMatch } from '@std/assert';
import { mockFetch, resetFetch } from '@c4spar/mock-fetch';
import { assertSpyCalls } from '@std/testing/mock';
import { OtakumodeService } from '@scope/service/otakumode';
import { createMockLogger, createMockSecret } from '@scope/common/testing';

describe('OtakumodeService', () => {
  let config: ReturnType<typeof createMockSecret>['service'];
  let logger: ReturnType<typeof createMockLogger>['logger'];
  let spies: ReturnType<typeof createMockLogger>['spies'];

  beforeEach(() => {
    config = createMockSecret({
      FEED: 'https://feed.test',
      CLIENT_REQUEST_TIMEOUT: '5000',
    }).service;
    const loggerStub = createMockLogger();
    logger = loggerStub.logger;
    spies = loggerStub.spies;
    resetFetch();
  });

  afterEach(() => {
    resetFetch();
  });

  it('returns parsed RSS items for valid XML', async () => {
    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Tokyo Otaku Mode News</title>
    <link>https://otakumode.com/</link>
    <description>Test description</description>
    <author>Tokyo Otaku Mode</author>
    <language>en-us</language>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" rel="self" href="https://otakumode.com/news/feed" type="application/rss+xml"></atom:link>
    <item>
      <title>Test News</title>
      <link>https://otakumode.com/news/test</link>
      <description>Test description</description>
      <content:encoded>Test content</content:encoded>
      <pubDate>Sun, 05 Oct 2025 09:06:11 GMT</pubDate>
      <guid>test123</guid>
      <mainId>test123</mainId>
    </item>
    <item>
      <title>Test News 2</title>
      <link>https://otakumode.com/news/test-2</link>
      <description>Test description 2</description>
      <content:encoded>Test content 2</content:encoded>
      <pubDate>Mon, 06 Oct 2025 09:06:11 GMT</pubDate>
      <guid>test456</guid>
      <mainId>test456</mainId>
    </item>
  </channel>
</rss>`;
    mockFetch(
      'https://feed.test/news/feed',
      {
        status: 200,
        headers: { 'content-type': 'text/xml' },
        body: feed,
      },
    );

    const service = new OtakumodeService(config, logger);
    const result = await service.rss('en');
    const requestMeta = spies.info.calls[0].args[1] as Record<string, unknown>;
    const successMeta = spies.info.calls[1].args[1] as Record<string, unknown>;

    assertEquals(result?.length, 2);
    assertEquals(result?.[0].guid, 'test123');
    assertEquals(result?.[0].title, 'Test News');
    assertSpyCalls(spies.info, 2);
    assertSpyCalls(spies.warn, 0);
    assertObjectMatch(requestMeta, {
      host: 'feed.test',
      path: '/news/feed',
      timeout: 5000,
    });
    assertObjectMatch(successMeta, {
      host: 'feed.test',
      path: '/news/feed',
      timeout: 5000,
      itemCount: 2,
    });
  });

  it('warns with request context when feed payload validation fails', async () => {
    mockFetch(
      'https://feed.test/news/feed',
      {
        status: 200,
        headers: { 'content-type': 'text/xml' },
        body: '',
      },
    );

    const service = new OtakumodeService(config, logger);
    const result = await service.rss('en');
    const warnMeta = spies.warn.calls[0].args[1] as {
      issues?: unknown;
      [key: string]: unknown;
    };

    assertEquals(result, undefined);
    assertSpyCalls(spies.info, 1);
    assertSpyCalls(spies.warn, 1);
    assertEquals(
      spies.warn.calls[0].args[0],
      'OtakuMode RSS payload validation failed',
    );
    assertObjectMatch(warnMeta, {
      host: 'feed.test',
      path: '/news/feed',
      timeout: 5000,
    });
    assertEquals(Array.isArray(warnMeta.issues), true);
  });

  it('logs request failures and returns undefined', async () => {
    mockFetch(
      'https://feed.test/news/feed',
      {
        status: 500,
        body: 'Server error',
      },
    );

    const service = new OtakumodeService(config, logger);
    const result = await service.rss('en');
    const errorMeta = spies.error.calls[0].args[1] as Record<string, unknown>;

    assertEquals(result, undefined);
    assertSpyCalls(spies.info, 1);
    assertSpyCalls(spies.error, 1);
    assertEquals(spies.error.calls[0].args[0], 'OtakuMode RSS request failed');
    assertObjectMatch(errorMeta, {
      host: 'feed.test',
      path: '/news/feed',
      timeout: 5000,
    });
  });

  it('fails gracefully when FEED configuration is invalid', async () => {
    const invalidConfig = createMockSecret({
      FEED: 'placeholder-feed-value',
      CLIENT_REQUEST_TIMEOUT: '5000',
    }).service;

    const service = new OtakumodeService(invalidConfig, logger);
    const result = await service.rss('en');
    const errorMeta = spies.error.calls[0].args[1] as Record<string, unknown>;

    assertEquals(result, undefined);
    assertSpyCalls(spies.info, 0);
    assertSpyCalls(spies.error, 1);
    assertEquals(
      spies.error.calls[0].args[0],
      'Otakumode RSS feed configuration is invalid',
    );
    assertObjectMatch(errorMeta, { timeout: 5000 });
  });
});
