import { OnAppBootstrap } from '@danet/core/hook';
import type { TmdbConfiguration, TmdbImage } from '../tmdb.types.ts';

const IMAGE_SIZE_PATTERN = /w(\d+)$/;

export enum ImageProviderType {
  POSTER,
  BACKDROP,
  LOGO,
  STILL,
}

// TODO: add database caching and periodic refresh, as per comment in tmdb.service.ts
//       onAppBootstrap() should perform the initial fetch and store in DB
//       then this class should read from DB and provide a method to refresh the data
//       with a sensible TTL (e.g., 24 hours)
export class ImageProvider implements OnAppBootstrap {
  private baseImageUrl: string;
  private posterSizes: string[];
  private backdropSizes: string[];
  private logoSizes: string[];
  private stillSizes: string[];

  constructor(configuration: TmdbConfiguration) {
    const { images } = configuration;
    this.baseImageUrl = images.secure_base_url;
    this.posterSizes = images.poster_sizes;
    this.backdropSizes = images.backdrop_sizes;
    this.logoSizes = images.logo_sizes;
    this.stillSizes = images.still_sizes;
  }

  async onAppBootstrap(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  getImageUrl = (
    size: string,
    filePath: string | null,
  ): string => filePath ? `${this.baseImageUrl}${size}${filePath}` : '';

  getImageConfig(
    image: TmdbImage,
    type: ImageProviderType,
  ): { url: string; type: ImageProviderType } {
    const width = image.width ?? 0;
    const filePath = image.file_path ?? null;
    switch (type) {
      case ImageProviderType.POSTER:
        return {
          url: this.getImageUrl(
            this.selectSize(this.posterSizes, width),
            filePath,
          ),
          type: ImageProviderType.POSTER,
        };
      case ImageProviderType.BACKDROP:
        return {
          url: this.getImageUrl(
            this.selectSize(this.backdropSizes, width),
            filePath,
          ),
          type: ImageProviderType.BACKDROP,
        };
      case ImageProviderType.LOGO:
        return {
          url: this.getImageUrl(
            this.selectSize(this.logoSizes, width),
            filePath,
          ),
          type: ImageProviderType.LOGO,
        };
      case ImageProviderType.STILL:
        return {
          url: this.getImageUrl(
            this.selectSize(this.stillSizes, width),
            filePath,
          ),
          type: ImageProviderType.STILL,
        };
    }
  }

  getUrl(image: TmdbImage, type: ImageProviderType): string {
    return this.getImageConfig(image, type).url;
  }

  private selectSize(sizes: string[], width: number): string {
    let previousSize: string | null = null;
    let previousWidth = 0;

    for (let i = 0; i < sizes.length; i++) {
      const size = sizes[i];
      const sizeWidth = this.extractWidthAsIntFrom(size);

      if (sizeWidth && sizeWidth > width) {
        if (
          previousSize != null && width > (previousWidth + sizeWidth) / 2
        ) {
          return size;
        } else if (previousSize != null) {
          return previousSize;
        }
      } else if (i === sizes.length - 1) {
        if (width < sizeWidth! * 2) {
          return size;
        }
      }

      previousSize = size;
      previousWidth = sizeWidth!;
    }

    return previousSize || sizes[sizes.length - 1];
  }

  private extractWidthAsIntFrom(size: string): number | null {
    const match = size.match(IMAGE_SIZE_PATTERN);
    return match?.[1] ? parseInt(match[1]) : null;
  }
}
