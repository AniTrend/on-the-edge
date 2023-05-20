export interface TheXemDataModel {
  result: string;
  data: TheXemModel[];
  message: string;
}

export interface TheXemModel {
  scene: TheXemSceneModel;
  tvdb: TheXemSceneModel;
  anidb: TheXemSceneModel;
}

export interface TheXemSceneModel {
  season: number;
  episode: number;
  absolute: number;
}
