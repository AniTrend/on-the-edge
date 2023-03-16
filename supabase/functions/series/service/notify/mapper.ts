import { Anime, IAnime, Ids, ITrailer, Mapping, Trailer } from './types.d.ts';

export const transformMappings = (input: Mapping[]): Ids => {
  const mappings: Ids = {};
  input.forEach((mapping) => {
    const [serviceKey] = mapping.service.split('/');
    if (serviceKey) {
      mappings[serviceKey] = mapping.serviceId;
    }
  });
  return mappings;
};

const transformTrailers = (trailers: ITrailer[]): Trailer[] => {
  const baseUrl = 'https://www.youtube.com/watch?v=';
  return trailers.map((trailer) => {
    const platform = trailer.service.toLowerCase();
    if (platform === 'youtube') {
      return {
        url: baseUrl + trailer.serviceId,
        type: platform,
        thumbnail:
          `https://img.youtube.com/vi/${trailer.serviceId}/maxresdefault.jpg`,
      };
    } else {
      return {
        url: trailer.serviceId,
        type: platform,
      };
    }
  });
};

export const fromModel = (model: IAnime): Anime => ({
  id: model.id,
  title: model.title,
  type: model.type,
  summary: model.summary,
  status: model.status,
  startDate: model.startDate,
  endDate: model.endDate,
  episodeCount: model.episodeCount,
  episodeLength: model.episodeLength,
  source: model.source,
  image: model.image,
  rating: model.rating,
  trailers: transformTrailers(model.trailers),
  links: model.links,
  ids: transformMappings(model.mappings),
});
