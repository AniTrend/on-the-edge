export interface TheXem {
  scene: TheXemScene;
  tvdb: TheXemScene;
  anidb: TheXemScene;
}

export interface TheXemScene {
  season: number;
  episode: number;
  absolute: number;
}
