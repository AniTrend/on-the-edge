import type { SeriesImageAttributes } from '../series.types.ts';

type RankedImage = {
  image: SeriesImageAttributes;
  index: number;
};

const preferredBuckets = (locale?: string | null): string[] => {
  const deviceLanguage = toLanguage(locale);
  return deviceLanguage && deviceLanguage !== 'jp'
    ? ['jp', deviceLanguage]
    : ['jp'];
};

const toLanguage = (locale?: string | null): string | null => {
  if (!locale) {
    return null;
  }

  const [language] = locale.toLowerCase().split(/[-_]/);
  return language || null;
};

const imageArea = ({ width, height }: SeriesImageAttributes) => width * height;

const rankImage = (
  candidate: RankedImage,
  bucket: string,
): [number, number, number] => {
  const language = toLanguage(candidate.image.locale);
  const localeRank = language === bucket ? 2 : language === null ? 1 : 0;

  return [localeRank, imageArea(candidate.image), -candidate.index];
};

const compareRank = (
  left: [number, number, number],
  right: [number, number, number],
) => {
  for (let index = 0; index < left.length; index++) {
    if (left[index] !== right[index]) {
      return right[index] - left[index];
    }
  }

  return 0;
};

const selectForBucket = (
  images: RankedImage[],
  bucket: string,
  usedUrls: Set<string>,
): RankedImage | null => {
  let best: RankedImage | null = null;
  let bestRank: [number, number, number] | null = null;

  for (const candidate of images) {
    if (usedUrls.has(candidate.image.url)) {
      continue;
    }

    const candidateRank = rankImage(candidate, bucket);
    if (!bestRank || compareRank(bestRank, candidateRank) > 0) {
      best = candidate;
      bestRank = candidateRank;
    }
  }

  return best;
};

export const selectSeriesImages = (
  images: SeriesImageAttributes[],
  locale?: string | null,
): SeriesImageAttributes[] => {
  const groupedImages = new Map<SeriesImageAttributes['type'], RankedImage[]>();
  const typeOrder: SeriesImageAttributes['type'][] = [];

  for (const [index, image] of images.entries()) {
    const group = groupedImages.get(image.type);
    if (group) {
      group.push({ image, index });
      continue;
    }

    groupedImages.set(image.type, [{ image, index }]);
    typeOrder.push(image.type);
  }

  const selectedImages: SeriesImageAttributes[] = [];
  const buckets = preferredBuckets(locale);
  const usedUrls = new Set<string>();

  for (const type of typeOrder) {
    const group = groupedImages.get(type);
    if (!group) {
      continue;
    }

    for (const bucket of buckets) {
      const selected = selectForBucket(group, bucket, usedUrls);
      if (!selected) {
        continue;
      }

      usedUrls.add(selected.image.url);
      selectedImages.push(selected.image);
    }
  }

  return selectedImages;
};
