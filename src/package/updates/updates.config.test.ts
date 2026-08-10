import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertThrows } from '@std/assert';
import { loadUpdateSources } from './updates.config.ts';

const validYaml = `schemaVersion: 1
products:
  ANITREND_APP:
    repository: AniTrend/anitrend-app
    version:
      propertiesPath: gradle/version.properties
    channels:
      STABLE:
        selector:
          type: stable
        assets:
          preferred:
            - app-github-release.apk
            - app-release.apk
      BETA:
        selector:
          type: prerelease
          identifiers:
            - beta
            - rc
        rollingWindowDays: 90
      EXPERIMENTAL:
        selector:
          type: prerelease
          identifiers:
            - alpha
            - dev
        rollingWindowDays: 30
  ANITREND_V2:
    repository: AniTrend/anitrend-v2
    version:
      propertiesPath: gradle/version.properties
    channels:
      STABLE:
        selector:
          type: stable
`;

/** Write YAML to a temp file and return its path (caller cleans up). */
const writeConfig = (yaml: string): string => {
  const path = Deno.makeTempFileSync({ suffix: '.yml' });
  Deno.writeTextFileSync(path, yaml);
  return path;
};

const withConfig = <T>(yaml: string, fn: (path: string) => T): T => {
  const path = writeConfig(yaml);
  try {
    return fn(path);
  } finally {
    Deno.removeSync(path);
  }
};

describe('loadUpdateSources', () => {
  it('parses a valid document into the flattened source list', () => {
    withConfig(validYaml, (path) => {
      const sources = loadUpdateSources(path);

      assertEquals(sources, [
        {
          product: 'ANITREND_APP',
          channel: 'STABLE',
          repository: 'AniTrend/anitrend-app',
          propertiesPath: 'gradle/version.properties',
          selector: { type: 'stable' },
          assets: ['app-github-release.apk', 'app-release.apk'],
        },
        {
          product: 'ANITREND_APP',
          channel: 'BETA',
          repository: 'AniTrend/anitrend-app',
          propertiesPath: 'gradle/version.properties',
          selector: { type: 'prerelease', identifiers: ['beta', 'rc'] },
          rollingWindowDays: 90,
        },
        {
          product: 'ANITREND_APP',
          channel: 'EXPERIMENTAL',
          repository: 'AniTrend/anitrend-app',
          propertiesPath: 'gradle/version.properties',
          selector: { type: 'prerelease', identifiers: ['alpha', 'dev'] },
          rollingWindowDays: 30,
        },
        {
          product: 'ANITREND_V2',
          channel: 'STABLE',
          repository: 'AniTrend/anitrend-v2',
          propertiesPath: 'gradle/version.properties',
          selector: { type: 'stable' },
        },
      ]);
    });
  });

  it('accepts a prerelease selector without identifiers', () => {
    const yaml = `schemaVersion: 1
products:
  ANITREND_APP:
    repository: AniTrend/anitrend-app
    channels:
      BETA:
        selector:
          type: prerelease
`;
    withConfig(yaml, (path) => {
      const sources = loadUpdateSources(path);
      assertEquals(sources.length, 1);
      assertEquals(sources[0].selector, { type: 'prerelease' });
      assertEquals(sources[0].rollingWindowDays, undefined);
    });
  });

  it('rejects a document missing schemaVersion', () => {
    const yaml = `products:
  ANITREND_APP:
    repository: AniTrend/anitrend-app
    channels:
      STABLE:
        selector:
          type: stable
`;
    withConfig(yaml, (path) => {
      assertThrows(
        () => loadUpdateSources(path),
        Error,
        'schemaVersion: Invalid literal value, expected 1',
      );
    });
  });

  it('rejects an unsupported schemaVersion', () => {
    const yaml = `schemaVersion: 2
products:
  ANITREND_APP:
    repository: AniTrend/anitrend-app
    channels:
      STABLE:
        selector:
          type: stable
`;
    withConfig(yaml, (path) => {
      assertThrows(
        () => loadUpdateSources(path),
        Error,
        'schemaVersion: Invalid literal value, expected 1',
      );
    });
  });

  it('rejects an unknown product', () => {
    const yaml = `schemaVersion: 1
products:
  OTHER_APP:
    repository: AniTrend/anitrend-app
    channels:
      STABLE:
        selector:
          type: stable
`;
    withConfig(yaml, (path) => {
      assertThrows(
        () => loadUpdateSources(path),
        Error,
        'Invalid update sources config',
      );
    });
  });

  it('rejects an unknown channel', () => {
    const yaml = `schemaVersion: 1
products:
  ANITREND_APP:
    repository: AniTrend/anitrend-app
    channels:
      NIGHTLY:
        selector:
          type: stable
`;
    withConfig(yaml, (path) => {
      assertThrows(
        () => loadUpdateSources(path),
        Error,
        'Invalid update sources config',
      );
    });
  });

  it('rejects an invalid repository value', () => {
    const yaml = `schemaVersion: 1
products:
  ANITREND_APP:
    repository: https://github.com/AniTrend/anitrend-app
    channels:
      STABLE:
        selector:
          type: stable
`;
    withConfig(yaml, (path) => {
      assertThrows(
        () => loadUpdateSources(path),
        Error,
        'repository must be owner/repo',
      );
    });
  });

  it('rejects an invalid properties path', () => {
    const yaml = `schemaVersion: 1
products:
  ANITREND_APP:
    repository: AniTrend/anitrend-app
    version:
      propertiesPath: ../gradle/version.properties
    channels:
      STABLE:
        selector:
          type: stable
`;
    withConfig(yaml, (path) => {
      assertThrows(
        () => loadUpdateSources(path),
        Error,
        'properties path contains invalid characters',
      );
    });
  });

  it('rejects duplicate YAML keys', () => {
    const yaml = `schemaVersion: 1
products:
  ANITREND_APP:
    repository: AniTrend/anitrend-app
    channels:
      STABLE:
        selector:
          type: stable
      STABLE:
        selector:
          type: prerelease
`;
    withConfig(yaml, (path) => {
      assertThrows(
        () => loadUpdateSources(path),
        Error,
        'Invalid YAML',
      );
    });
  });

  it('rejects invalid rollingWindowDays values', () => {
    for (const value of [0, -5, 1.5, 4000]) {
      const yaml = `schemaVersion: 1
products:
  ANITREND_APP:
    repository: AniTrend/anitrend-app
    channels:
      BETA:
        selector:
          type: prerelease
        rollingWindowDays: ${value}
`;
      withConfig(yaml, (path) => {
        assertThrows(
          () => loadUpdateSources(path),
          Error,
          'Invalid update sources config',
        );
      });
    }
  });

  it('rejects an empty identifiers list', () => {
    const yaml = `schemaVersion: 1
products:
  ANITREND_APP:
    repository: AniTrend/anitrend-app
    channels:
      BETA:
        selector:
          type: prerelease
          identifiers: []
`;
    withConfig(yaml, (path) => {
      assertThrows(
        () => loadUpdateSources(path),
        Error,
        'Invalid update sources config',
      );
    });
  });

  it('rejects too many identifiers', () => {
    const identifiers = Array.from(
      { length: 11 },
      (_, index) => `- id${index}`,
    ).join('\n            ');
    const yaml = `schemaVersion: 1
products:
  ANITREND_APP:
    repository: AniTrend/anitrend-app
    channels:
      BETA:
        selector:
          type: prerelease
          identifiers:
            ${identifiers}
`;
    withConfig(yaml, (path) => {
      assertThrows(
        () => loadUpdateSources(path),
        Error,
        'Invalid update sources config',
      );
    });
  });

  it('rejects a document missing products', () => {
    withConfig('schemaVersion: 1\n', (path) => {
      assertThrows(
        () => loadUpdateSources(path),
        Error,
        'products: Required',
      );
    });
  });

  it('rejects a product missing channels', () => {
    const yaml = `schemaVersion: 1
products:
  ANITREND_APP:
    repository: AniTrend/anitrend-app
`;
    withConfig(yaml, (path) => {
      assertThrows(
        () => loadUpdateSources(path),
        Error,
        'channels: Required',
      );
    });
  });

  it('rejects malformed YAML', () => {
    withConfig('schemaVersion: 1\nproducts: [unclosed\n', (path) => {
      assertThrows(
        () => loadUpdateSources(path),
        Error,
        'Invalid YAML',
      );
    });
  });

  it('throws a descriptive error when the external path is missing', () => {
    const dir = Deno.makeTempDirSync();
    try {
      const missing = `${dir}/missing.yml`;
      assertThrows(
        () => loadUpdateSources(missing),
        Error,
        'Unable to read update sources config',
      );
    } finally {
      Deno.removeSync(dir, { recursive: true });
    }
  });

  it('throws a descriptive error when the external file is malformed', () => {
    withConfig('not: [valid: yaml\n', (path) => {
      assertThrows(
        () => loadUpdateSources(path),
        Error,
        'Invalid YAML',
      );
    });
  });

  it('loads the embedded default configuration when no path is given', () => {
    for (const path of [undefined, '', '   ']) {
      const sources = loadUpdateSources(path);
      assertEquals(sources.length, 6);
      assertEquals(
        new Set(sources.map((source) => source.product)),
        new Set(['ANITREND_APP', 'ANITREND_V2']),
      );
      const appChannels = sources
        .filter((source) => source.product === 'ANITREND_APP')
        .map((source) => source.channel)
        .sort();
      assertEquals(appChannels, ['BETA', 'EXPERIMENTAL', 'STABLE']);
      const v2Channels = sources
        .filter((source) => source.product === 'ANITREND_V2')
        .map((source) => source.channel)
        .sort();
      assertEquals(v2Channels, ['BETA', 'EXPERIMENTAL', 'STABLE']);
    }

    const appStable = loadUpdateSources().find((source) =>
      source.product === 'ANITREND_APP' && source.channel === 'STABLE'
    );
    assertEquals(appStable?.assets, [
      'app-github-release.apk',
      'app-release.apk',
    ]);
    const appBeta = loadUpdateSources().find((source) =>
      source.product === 'ANITREND_APP' && source.channel === 'BETA'
    );
    assertEquals(appBeta?.rollingWindowDays, 90);
    const appExperimental = loadUpdateSources().find((source) =>
      source.product === 'ANITREND_APP' && source.channel === 'EXPERIMENTAL'
    );
    assertEquals(appExperimental?.rollingWindowDays, 30);
  });
});
