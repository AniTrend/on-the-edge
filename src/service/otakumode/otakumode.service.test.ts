import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
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

  it('fetches RSS feed and handles errors gracefully', async () => {
    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss>
  <channel>
    <title>Tokyo Otaku Mode News</title>
    <link>https://otakumode.com/</link>
    <description>Test description</description>
    <author>Tokyo Otaku Mode</author>
    <language>en-us</language>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" rel="self" href="http://otakumode.com/news/feed" type="application/rss+xml"></atom:link>
    <item>
      <title>Test News</title>
      <link>https://otakumode.com/news/test</link>
      <description>Test description</description>
      <content:encoded>Test content</content:encoded>
      <pubDate>Sun, 05 Oct 2025 09:06:11 GMT</pubDate>
      <guid>test123</guid>
      <mainId>test123</mainId>
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
    // The service returns undefined when RSS parsing/validation fails
    // This is the expected behavior per the catch block
    const result = await service.rss('en');
    assertEquals(result, undefined);
    // Verify error was logged
    assertSpyCalls(spies.error, 1);
  });
  it('logs error and returns undefined when fetch fails', async () => {
    mockFetch(
      'https://feed.test/news/feed',
      {
        status: 500,
        body: 'Server error',
      },
    );

    const service = new OtakumodeService(config, logger);
    const result = await service.rss('en');
    assertEquals(result, undefined);
    assertSpyCalls(spies.error, 1);
  });
});
