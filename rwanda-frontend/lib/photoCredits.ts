/**
 * Photography used across the public pages and login screen.
 * All images are free to use; CC BY-SA works require attribution, which the footer renders.
 */
export interface PhotoCredit {
  /** Path under /public */
  src: string;
  /** Photographer / author as credited at source */
  author: string;
  /** Short licence label */
  license: string;
  /** Link to the source page (licence terms live there) */
  sourceUrl: string;
  /** Where the photo was taken (for captions) */
  location: string;
}

export const PHOTOS = {
  heroTerraces: {
    src: '/images/rwanda/hero-terraces.jpg',
    author: 'Peace Batuma',
    license: 'CC BY-SA 4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:A_hill_with_terraces.jpg',
    location: 'Rwanda',
  },
  thousandHills: {
    src: '/images/rwanda/thousand-hills.jpg',
    author: 'Hansueli Krapf',
    license: 'CC BY-SA 3.0',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:2013-06-05_12-03-37_Rwanda_Western_Province_-_Gaseke_6h_(cropped_2).jpg',
    location: 'Western Province, Rwanda',
  },
  hillsideVillage: {
    src: '/images/rwanda/hillside-village.jpg',
    author: 'Tobias Doering',
    license: 'Unsplash License',
    sourceUrl: 'https://unsplash.com/photos/u7mUyepYTlA',
    location: 'Rwanda',
  },
  terracesClose: {
    src: '/images/rwanda/terraces-close.jpg',
    author: 'Dusabemungu Ange de la Victoire',
    license: 'CC BY-SA 4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Terraces_in_Rwanda.jpg',
    location: 'Rwanda',
  },
} as const satisfies Record<string, PhotoCredit>;

export const ALL_PHOTO_CREDITS: PhotoCredit[] = Object.values(PHOTOS);
