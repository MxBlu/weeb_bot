// Enum of all the scrapers runnable
export enum ScraperType {
  Mangadex,
  Mangasee,
  MangaseeFallback,
  CatManga
}

export const ScraperTypeNames = Object.keys(ScraperType).filter(k => isNaN(Number(k)));

// Object map from lowercase key to ScraperType enum
const lowercaseLookup: { [key: string]: ScraperType } =
    ScraperTypeNames.reduce(
      (acc, k) => ({ ...acc, [k.toLowerCase()]: ScraperType[k] }), {});

// Return a ScraperType enum from a lower-case string representation
export const typeFromLowercase = (type: string): ScraperType => {
  return lowercaseLookup[type];
}