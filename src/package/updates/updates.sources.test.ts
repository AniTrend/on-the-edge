import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertThrows } from '@std/assert';
import { parseUpdateSources } from './updates.sources.ts';

const validConfig = {
  sources: [
    {
      product: 'ANITREND_APP',
      channel: 'STABLE',
      repository: 'AniTrend/anitrend-app',
      propertiesPath: 'gradle/version.properties',
      selector: 'stable',
      assets: ['app-github-release.apk', 'app-release.apk'],
    },
    {
      product: 'ANITREND_APP',
      channel: 'BETA',
      repository: 'AniTrend/anitrend-app',
      propertiesPath: 'gradle/version.properties',
      selector: 'prerelease',
      rollingWindowDays: 90,
    },
    {
      product: 'ANITREND_V2',
      channel: 'STABLE',
      repository: 'AniTrend/anitrend-v2',
      propertiesPath: 'gradle/version.properties',
      selector: 'stable',
    },
  ],
};

describe('parseUpdateSources', () => {
  it('parses a valid configuration covering both products', () => {
    const sources = parseUpdateSources(JSON.stringify(validConfig));

    assertEquals(sources.length, 3);
    assertEquals(sources[0].product, 'ANITREND_APP');
    assertEquals(sources[0].channel, 'STABLE');
    assertEquals(sources[0].repository, 'AniTrend/anitrend-app');
    assertEquals(sources[0].selector, 'stable');
    assertEquals(sources[0].assets, [
      'app-github-release.apk',
      'app-release.apk',
    ]);
    assertEquals(sources[1].rollingWindowDays, 90);
    assertEquals(sources[2].product, 'ANITREND_V2');
  });

  it('returns no sources for absent or empty values', () => {
    assertEquals(parseUpdateSources(undefined), []);
    assertEquals(parseUpdateSources(''), []);
    assertEquals(parseUpdateSources('   '), []);
  });

  it('rejects malformed JSON clearly', () => {
    assertThrows(
      () => parseUpdateSources('{not json'),
      Error,
      'UPDATE_SOURCES is not valid JSON',
    );
  });

  it('rejects a missing required field', () => {
    const config = {
      sources: [{
        product: 'ANITREND_APP',
        channel: 'STABLE',
        selector: 'stable',
      }],
    };
    assertThrows(
      () => parseUpdateSources(JSON.stringify(config)),
      Error,
      'Invalid UPDATE_SOURCES configuration',
    );
  });

  it('rejects an unknown product', () => {
    const config = {
      sources: [{
        product: 'OTHER_APP',
        channel: 'STABLE',
        repository: 'AniTrend/anitrend-app',
        selector: 'stable',
      }],
    };
    assertThrows(
      () => parseUpdateSources(JSON.stringify(config)),
      Error,
      'Invalid UPDATE_SOURCES configuration',
    );
  });

  it('rejects a malformed repository value', () => {
    const config = {
      sources: [{
        product: 'ANITREND_APP',
        channel: 'STABLE',
        repository: 'https://github.com/AniTrend/anitrend-app',
        selector: 'stable',
      }],
    };
    assertThrows(
      () => parseUpdateSources(JSON.stringify(config)),
      Error,
      'Invalid UPDATE_SOURCES configuration',
    );
  });

  it('rejects an unknown selector', () => {
    const config = {
      sources: [{
        product: 'ANITREND_APP',
        channel: 'STABLE',
        repository: 'AniTrend/anitrend-app',
        selector: 'nightly',
      }],
    };
    assertThrows(
      () => parseUpdateSources(JSON.stringify(config)),
      Error,
      'Invalid UPDATE_SOURCES configuration',
    );
  });

  it('rejects out-of-bounds rolling window days', () => {
    const config = {
      sources: [{
        product: 'ANITREND_APP',
        channel: 'BETA',
        repository: 'AniTrend/anitrend-app',
        selector: 'prerelease',
        rollingWindowDays: 0,
      }],
    };
    assertThrows(
      () => parseUpdateSources(JSON.stringify(config)),
      Error,
      'Invalid UPDATE_SOURCES configuration',
    );
  });

  it('rejects duplicate product/channel sources', () => {
    const config = {
      sources: [
        {
          product: 'ANITREND_APP',
          channel: 'STABLE',
          repository: 'AniTrend/anitrend-app',
          selector: 'stable',
        },
        {
          product: 'ANITREND_APP',
          channel: 'STABLE',
          repository: 'AniTrend/other-repo',
          selector: 'stable',
        },
      ],
    };
    assertThrows(
      () => parseUpdateSources(JSON.stringify(config)),
      Error,
      'duplicate product/channel',
    );
  });

  it('rejects a properties path with traversal characters', () => {
    const config = {
      sources: [{
        product: 'ANITREND_APP',
        channel: 'STABLE',
        repository: 'AniTrend/anitrend-app',
        propertiesPath: '../gradle/version.properties',
        selector: 'stable',
      }],
    };
    assertThrows(
      () => parseUpdateSources(JSON.stringify(config)),
      Error,
      'Invalid UPDATE_SOURCES configuration',
    );
  });
});
