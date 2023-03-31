// automated task to fetch genres and save them into our DB
const genreMediaMap = {
  'Action': 0,
  'Adventure': 0,
  'Comedy': 0,
  'Drama': 0,
  'Ecchi': 0,
  'Fantasy': 0,
  'Hentai': 0,
  'Horror': 0,
  'Mahou Shoujo': 0,
  'Mecha': 0,
  'Music': 0,
  'Mystery': 0,
  'Psychological': 0,
  'Romance': 0,
  'Sci-Fi': 0,
  'Slice of Life': 0,
  'Sports': 0,
  'Supernatural': 0,
  'Thriller': 0,
};

// fetch infomation from growth
const enabledFeatures = (): string[] => {
  return [];
};

// get settings from our database or something based on an app version?
export const config = {
  // extract this from database
  image: {
    banner: 'https://anitrend.co/media/image/banner/default.webp',
    poster: 'https://anitrend.co/media/image/poster/default.webp',
  },
  // extract this from database
  icon: {
    error: 'https://anitrend.co/media/icons/error.svg',
    loading: 'https://anitrend.co/media/icons/loading.svg',
  },
  // extract this from database
  release: {
    version: '2.0.0-alpha40',
    code: '200000040',
  },
  // extract this from database
  info: {
    faq: 'https://docs.anitrend.co/faq',
    patreon: 'https://patreon.com/wax911',
    discord: 'https://discord.gg/2wzTqnF',
  },
  genres: genreMediaMap,
  features: enabledFeatures(),
};
