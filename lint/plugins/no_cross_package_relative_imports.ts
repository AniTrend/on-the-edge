import { dirname, fromFileUrl, join, normalize } from '@std/path';

const RELATIVE_SPECIFIER = /^(\.\.?)(\/|$)/;
const SRC_DIR = 'src';

interface PackageInfo {
  packageName: string | null;
  subpath: string;
  inSrc: boolean;
}

function normalizeFilePath(filename: string): string {
  let normalized = filename;
  if (normalized.startsWith('file://')) {
    normalized = fromFileUrl(normalized);
  }
  normalized = normalized.replace(/\\/g, '/');
  normalized = normalize(normalized);
  if (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }
  return normalized;
}

function extractPackageInfo(filePath: string): PackageInfo {
  const normalized = normalizeFilePath(filePath).replace(/^\/+/, '');
  const segments = normalized.split('/');
  const srcIndex = segments.indexOf(SRC_DIR);

  if (srcIndex === -1) {
    return { packageName: null, subpath: normalized, inSrc: false };
  }

  const afterSrc = segments.slice(srcIndex + 1);

  if (afterSrc.length === 0) {
    return { packageName: '', subpath: '', inSrc: true };
  }

  if (afterSrc.length === 1) {
    return { packageName: '', subpath: afterSrc[0] ?? '', inSrc: true };
  }

  const [packageName, ...rest] = afterSrc;
  return {
    packageName,
    subpath: rest.join('/'),
    inSrc: true,
  };
}

function resolveRelative(filePath: string, specifier: string): string {
  const dir = dirname(normalizeFilePath(filePath));
  const base = dir === '.' ? '' : dir;
  return normalize(join(base, specifier));
}

export interface RelativeImportAnalysis {
  shouldReport: boolean;
  sourcePackage: string | null;
  targetPackage: string | null;
  targetPath: string | null;
}

export function analyzeRelativeImport(
  filename: string,
  specifier: string,
): RelativeImportAnalysis {
  if (!RELATIVE_SPECIFIER.test(specifier)) {
    return {
      shouldReport: false,
      sourcePackage: null,
      targetPackage: null,
      targetPath: null,
    };
  }

  const sourceInfo = extractPackageInfo(filename);
  if (!sourceInfo.inSrc) {
    return {
      shouldReport: false,
      sourcePackage: sourceInfo.packageName,
      targetPackage: null,
      targetPath: null,
    };
  }

  const resolved = resolveRelative(filename, specifier);
  const targetInfo = extractPackageInfo(resolved);

  if (!targetInfo.inSrc) {
    return {
      shouldReport: false,
      sourcePackage: sourceInfo.packageName,
      targetPackage: targetInfo.packageName,
      targetPath: resolved,
    };
  }

  const sourcePkg = sourceInfo.packageName ?? '';
  const targetPkg = targetInfo.packageName ?? '';

  const shouldReport = sourcePkg !== targetPkg;

  return {
    shouldReport,
    sourcePackage: sourcePkg,
    targetPackage: targetPkg,
    targetPath: resolved,
  };
}

function reportForSpecifier(
  context: Deno.lint.RuleContext,
  node: any,
  specifier: string,
) {
  const analysis = analyzeRelativeImport(context.filename, specifier);
  if (!analysis.shouldReport) {
    return;
  }

  const sourceLabel = analysis.sourcePackage
    ? `@scope/${analysis.sourcePackage}`
    : 'the root';
  const targetLabel = analysis.targetPackage
    ? `@scope/${analysis.targetPackage}`
    : 'the root';

  context.report({
    node,
    message:
      `Relative imports from ${sourceLabel} into ${targetLabel} are disallowed. Use the scoped module alias for the target package instead.`,
  });
}

const rule = {
  meta: {
    docs: {
      description:
        'Disallow relative imports that cross workspace package boundaries.',
      recommended: true,
      tags: ['recommended'],
    },
    type: 'problem',
  },
  create(context: Deno.lint.RuleContext) {
    return {
      ImportDeclaration(node: any) {
        if (typeof node.source.value === 'string') {
          reportForSpecifier(context, node.source, node.source.value);
        }
      },
      ExportAllDeclaration(node: any) {
        if (typeof node.source.value === 'string') {
          reportForSpecifier(context, node.source, node.source.value);
        }
      },
      ExportNamedDeclaration(node: any) {
        if (node.source && typeof node.source.value === 'string') {
          reportForSpecifier(context, node.source, node.source.value);
        }
      },
      ImportExpression(node: any) {
        const source = node.source;
        if (source.type === 'Literal' && typeof source.value === 'string') {
          reportForSpecifier(context, source, source.value);
        }
      },
    };
  },
};

const plugin = {
  name: 'anitrend',
  rules: {
    'no-cross-package-relative-imports': rule,
  },
};

export default plugin;
