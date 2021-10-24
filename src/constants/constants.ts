import * as dotenv from 'dotenv';
dotenv.config();

// Mangadex feed requesting settings
export const MANGADEX_CACHE_LOCATION = process.env.MANGADEX_CACHE_LOCATION;

// Numbers of mangas to list for a list query command
export const ENTRIES_PER_LIST_QUERY = 10;

// Env variable flag to disable NewChapterEventHandler
export const NEW_CHAPTER_EVENT_DISABLED = process.env.NEW_CHAPTER_EVENT_DISABLED === "true" || false;

// Time between checking if any events are present in the bugger for NewChapterEvent
export const NEW_CHAPTER_EVENT_FLUSH_INVERVAL = parseInt(process.env.NEW_CHAPTER_EVENT_FLUSH_INVERVAL) || 5000;
