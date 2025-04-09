import { assertEquals } from "@std/assert";
import { 
  SeasonCorrelationMapper, 
  MappingPattern, 
  EnhancedMergedSeason 
} from "./index.ts";
import { NotifyAnime } from "../../service/notify/types.ts";
import { SkyhookShow } from "../../service/skyhook/types.ts";
import { TmdbShow } from "../../service/tmdb/types.ts";

Deno.test("SeasonCorrelationMapper - Basic correlation", () => {
  // Setup test data
  const mockTmdb: TmdbShow = {
    id: 12345,
    name: "Test Anime",
    seasons: [
      {
        id: 1,
        name: "Season 1",
        season_number: 1,
        episode_count: 13,
        air_date: "2022-01-01",
        poster_path: "",
        overview: "",
        episodes: [
          {
            id: 101,
            name: "Episode 1",
            overview: "Test overview",
            air_date: "2022-01-01",
            episode_number: 1,
            season_number: 1,
            still_path: "",
            vote_average: 0,
            vote_count: 0,
            production_code: "",
            crew: [],
            guest_stars: [],
            show_id: "12345",
            runtime: 24
          },
          {
            id: 102,
            name: "Episode 2",
            overview: "Test overview",
            air_date: "2022-01-08",
            episode_number: 2,
            season_number: 1,
            still_path: "",
            vote_average: 0,
            vote_count: 0,
            production_code: "",
            crew: [],
            guest_stars: [],
            show_id: "12345",
            runtime: 24
          }
        ]
      }
    ]
  };

  const mockSkyhook: SkyhookShow = {
    tvdbId: 67890,
    name: "Test Anime",
    episodes: [
      {
        tvdbShowId: 67890,
        tvdbId: 201,
        title: "Episode 1",
        overview: "Test overview",
        airDate: "2022-01-01",
        seasonNumber: 1,
        episodeNumber: 1,
        absoluteEpisodeNumber: 1
      },
      {
        tvdbShowId: 67890,
        tvdbId: 202,
        title: "Episode 2",
        overview: "Test overview",
        airDate: "2022-01-08",
        seasonNumber: 1,
        episodeNumber: 2,
        absoluteEpisodeNumber: 2
      }
    ]
  };

  const mockNotify: NotifyAnime = {
    id: '1001',
    title: "Test Anime",
    format: "TV",
    episodes: 13,
    ovas: 2,
    seasons: 1
  };

  // Create mapper instance
  const mapper = new SeasonCorrelationMapper(
    mockNotify,
    mockSkyhook,
    mockTmdb,
    []
  );

  // Perform correlation
  const correlatedSeasons = mapper.correlateSeasons();

  // Assertions
  assertEquals(correlatedSeasons.length, 1, "Should return one season");
  assertEquals(correlatedSeasons[0].season_number, 1, "Should be season 1");
  assertEquals(correlatedSeasons[0].episodes.length, 2, "Should have 2 episodes");
  assertEquals(correlatedSeasons[0].mappingPattern, MappingPattern.SEQUENTIAL, "Should use sequential mapping");
  assertEquals(correlatedSeasons[0].episodes[0].provenance.sourceType, "merged", "Episode should have merged source type");
  assertEquals(correlatedSeasons[0].episodes[0].animeEpisodeIds?.notify, 1, "Episode should have anime ID");
});

Deno.test("SeasonCorrelationMapper - Special episodes handling", () => {
  // Setup test data with Season 0 (specials)
  const mockTmdb: TmdbShow = {
    id: 12345,
    name: "Test Anime",
    seasons: [
      {
        id: 0,
        name: "Specials",
        season_number: 0,
        episode_count: 2,
        air_date: "2022-01-01",
        poster_path: "",
        overview: "",
        episodes: [
          {
            id: 1,
            name: "Special 1",
            overview: "Special episode",
            air_date: "2021-12-25",
            episode_number: 1,
            season_number: 0,
            still_path: "",
            vote_average: 0,
            vote_count: 0,
            production_code: "",
            crew: [],
            guest_stars: [],
            show_id: "12345",
            runtime: 24
          },
          {
            id: 2,
            name: "Special 2",
            overview: "Special episode",
            air_date: "2022-06-30",
            episode_number: 2,
            season_number: 0,
            still_path: "",
            vote_average: 0,
            vote_count: 0,
            production_code: "",
            crew: [],
            guest_stars: [],
            show_id: "12345",
            runtime: 24
          }
        ]
      },
      {
        id: 1,
        name: "Season 1",
        season_number: 1,
        episode_count: 12,
        air_date: "2022-01-01",
        poster_path: "",
        overview: "",
        episodes: [
          {
            id: 101,
            name: "Episode 1",
            overview: "Test overview",
            air_date: "2022-01-01",
            episode_number: 1,
            season_number: 1,
            still_path: "",
            vote_average: 0,
            vote_count: 0,
            production_code: "",
            crew: [],
            guest_stars: [],
            show_id: "12345",
            runtime: 24
          }
        ]
      }
    ]
  };

  const mockSkyhook: SkyhookShow = {
    tvdbId: 67890,
    name: "Test Anime",
    episodes: [
      {
        tvdbShowId: 67890,
        tvdbId: 1,
        title: "OVA 1",
        overview: "Special episode",
        airDate: "2021-12-25",
        seasonNumber: 0,
        episodeNumber: 1,
        absoluteEpisodeNumber: null
      },
      {
        tvdbShowId: 67890,
        tvdbId: 2,
        title: "OVA 2",
        overview: "Special episode",
        airDate: "2022-06-30",
        seasonNumber: 0,
        episodeNumber: 2,
        absoluteEpisodeNumber: null
      },
      {
        tvdbShowId: 67890,
        tvdbId: 101,
        title: "Episode 1",
        overview: "Test overview",
        airDate: "2022-01-01",
        seasonNumber: 1,
        episodeNumber: 1,
        absoluteEpisodeNumber: 1
      }
    ]
  };

  const mockNotify: NotifyAnime = {
    id: 1001,
    title: "Test Anime",
    format: "TV",
    episodes: 12,
    ovas: 2,
    seasons: 1
  };

  // Create mapper instance
  const mapper = new SeasonCorrelationMapper(
    mockNotify,
    mockSkyhook,
    mockTmdb,
    []
  );

  // Perform correlation
  const correlatedSeasons = mapper.correlateSeasons();

  // Assertions
  assertEquals(correlatedSeasons.length >= 1, true, "Should return at least one season");
  
  // Find Season 0
  const specialsSeason = correlatedSeasons.find(s => s.season_number === 0);
  assertEquals(specialsSeason !== undefined, true, "Should have specials season");
  
  if (specialsSeason) {
    assertEquals(specialsSeason.isSpecial, true, "Should be marked as special");
    assertEquals(specialsSeason.episodes.length, 2, "Should have 2 special episodes");
    assertEquals(specialsSeason.mappingPattern !== undefined, true, "Should have a mapping pattern");
    assertEquals(specialsSeason.specialsMapping !== undefined, true, "Should have specials mapping info");
  }
});
