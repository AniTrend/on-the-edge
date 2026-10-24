import { assertEquals, assertThrows } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { CrewSchema, MovieSchema, ShowSchema } from './tmdb.schema.ts';

describe('TMDB schemas', () => {
  it('uses movie title and TV show name as separate required fields', () => {
    const movie = MovieSchema.parse({
      id: 1,
      title: 'Movie title',
      images: {},
    });

    assertEquals(movie.title, 'Movie title');
    assertEquals('name' in movie, false);
    assertThrows(() => MovieSchema.parse({ id: 1, images: {} }), Error);
    assertThrows(() => ShowSchema.parse({ id: 1, images: {} }), Error);
    assertEquals(
      ShowSchema.parse({ id: 2, name: 'Show name', images: {} }).name,
      'Show name',
    );
  });

  it('preserves arbitrary known-for departments and existing nullability', () => {
    const crew = {
      credit_id: 'credit-1',
      id: 1,
      name: 'Crew member',
    };

    assertEquals(
      CrewSchema.parse({ ...crew, known_for_department: 'Sound Design' })
        .known_for_department,
      'Sound Design',
    );
    assertEquals(
      CrewSchema.parse({ ...crew, known_for_department: null })
        .known_for_department,
      null,
    );
    assertEquals(
      CrewSchema.parse(crew).known_for_department,
      undefined,
    );
    assertThrows(
      () => CrewSchema.parse({ ...crew, known_for_department: 5 }),
      Error,
    );
  });
});
