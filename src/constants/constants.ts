import * as dotenv from 'dotenv';
dotenv.config();

// Mangadex feed requesting settings
export const MANGADEX_CACHE_LOCATION = process.env.MANGADEX_CACHE_LOCATION;

// Numbers of mangas to list for a list query command
export const ENTRIES_PER_LIST_QUERY = 10;
