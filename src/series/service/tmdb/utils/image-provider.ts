import { Configuration, Image } from '../remote/types.d.ts';

const IMAGE_SIZE_PATTERN = /w(\d+)$/;

export enum ImageProviderType {
  POSTER,
  BACKDROP,
  LOGO,
  STILL,
}

export class ImageProvider {
  private baseImageUrl: string;
  private posterSizes: string[];
  private backdropSizes: string[];
  private logoSizes: string[];
  private stillSizes: string[];

  constructor(configuration: Configuration) {
    const { images } = configuration;
    this.baseImageUrl = images.secure_base_url;
    this.posterSizes = images.poster_sizes;
    this.backdropSizes = images.backdrop_sizes;
    this.logoSizes = images.logo_sizes;
    this.stillSizes = images.still_sizes;
  }

  getImageUrl = (size: string, file_path: string | null) =>
    `${this.baseImageUrl}${size}${file_path}`;

  getUrl(image: Image, type: ImageProviderType): string {
    switch (type) {
      case ImageProviderType.POSTER:
        return this.getImageUrl(
          this.selectSize(this.posterSizes, image.width),
          image.file_path,
        );
      case ImageProviderType.BACKDROP:
        return this.getImageUrl(
          this.selectSize(this.backdropSizes, image.width),
          image.file_path,
        );
      case ImageProviderType.LOGO:
        return this.getImageUrl(
          this.selectSize(this.logoSizes, image.width),
          image.file_path,
        );
      case ImageProviderType.STILL:
        return this.getImageUrl(
          this.selectSize(this.stillSizes, image.width),
          image.file_path,
        );
    }
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
