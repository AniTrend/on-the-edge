# Anime to Western TV Show Season Correlation

This document explains how the season correlation system works for mapping Western TV show seasons to anime entries.

## Overview

The season correlation system handles the complex relationship between Western TV show seasons and anime releases. Western TV shows and anime often structure their seasons and episodes differently, making direct mapping challenging. This system:

1. Correlates seasons between different metadata sources (Skyhook, TMDb, Trakt) and anime sources (AnimeNotifier).
2. Detects and handles various mapping patterns that occur between Western TV and anime.
3. Provides special handling for Season 0 (specials, OVAs, ONAs) with different integration strategies.
4. Maintains data provenance to track the source and confidence of each mapping.

## Key Components

### 1. SeasonCorrelationMapper

The main class that orchestrates the correlation process:
- Extracts data from Western and anime sources
- Identifies mapping patterns using detector classes
- Correlates seasons and episodes according to detected patterns
- Handles special cases like Season 0 (OVAs, specials)

### 2. PatternDetector

Identifies the relationship pattern between Western TV seasons and anime:
- **SEQUENTIAL**: Direct 1:1 mapping (most common)
- **SPLIT_COURS**: One Western season maps to multiple anime cours
- **MERGED_SEASONS**: Multiple Western seasons map to one anime season
- **REARRANGED**: Episodes are in a different order

### 3. SpecialsDetector

Specifically handles "Season 0" content with different strategies:
- **SPECIALS_STANDALONE**: Keep specials as a separate season
- **SPECIALS_INTEGRATED**: Include specials within their related seasons
- **SPECIALS_DISTRIBUTED**: Distribute specials across multiple seasons

### 4. Configuration System

Manual mapping configuration for shows when automatic detection is insufficient:
- Override detected mapping patterns
- Specify specials handling strategy
- Define custom episode mappings for complex cases

## Mapping Strategies

### Season 0 / Specials Handling

Season 0 (specials, OVAs, ONAs) can be handled in three ways:

1. **Standalone**: Kept as a separate season, with metadata about when to watch
2. **Integrated**: Merged into regular seasons where they belong chronologically
3. **Distributed**: Spread across multiple seasons based on their content and air dates

### Split Cours Handling

When one Western season maps to multiple anime cours:
- Adds appropriate metadata noting the split
- Maintains mapping to the correct anime episodes
- Allows for proper display of episode ordering

### Data Provenance

Each episode maintains tracking information about:
- Which source(s) provided the data (TMDb, Skyhook, anime)
- Original IDs from each system
- Confidence score for the mapping
- Notes explaining mapping decisions

## Configuration 

For shows with complex mapping that can't be automatically detected, configure them in the `config.ts` file:

```typescript
"show_key": {
  animeIds: {
    mal: 12345,
    anilist: 12345,
  },
  tvShowIds: {
    tmdb: 67890,
    tvdb: 67891,
  },
  mappingPattern: MappingPattern.SPLIT_COURS,
  specialsHandling: "integrated",
  seasonMappings: {
    "1": 1,
    "2": 1, 
    "3": 2,
    "4": 2,
  },
}
```

## Usage Example

```typescript
// Create mapper with show data from various sources
const mapper = new SeasonCorrelationMapper(notifyAnime, skyhookShow, tmdbShow, relations);

// Get correlated seasons
const correlatedSeasons = mapper.correlateSeasons();

// Use the correlated seasons that include both Western and anime metadata
// Each season includes proper episode ordering and viewing recommendations
```

## Future Enhancements

Potential improvements for the correlation system:

1. More sophisticated pattern detection using machine learning
2. User feedback loop to improve correlation accuracy over time
3. Integration with viewing platforms to provide unified watch lists
4. Enhanced support for movies, spin-offs, and related content
