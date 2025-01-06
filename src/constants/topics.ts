import { MessengerTopic } from "bot-framework";

import { MangaAlert } from "../models/MangaAlert.js";
import { MangaChapter } from "../models/MangaChapter.js";
import { MangadexPulse } from "../models/MangadexPulse.js";

// Message topic for a new alert for a chapter
export const NewMangaAlertTopic = new MessengerTopic<MangaAlert>("NewMangaAlert");

// Message topic for a new Mangasee chapter being published
export const NewMangaseeItemTopic = new MessengerTopic<MangaChapter>("NewMangaseeItem");

// Message topic for a new Mangasee chapter being published
export const NewMangaseeFallbackItemTopic = new MessengerTopic<MangaChapter>("NewMangaseeFallbackItem");

// Message topic for a new Mangadex chapter being published
export const NewMangadexItemTopic = new MessengerTopic<MangaChapter>("NewMangadexItem");

// Message topic for a new NovelUpdates chapter being published
export const NewNovelUpdatesItemTopic = new MessengerTopic<MangaChapter>("NewNovelUpdatesItem");

// Message topic for a new Weeb Central chapter being published
export const NewWeebCentralItemTopic = new MessengerTopic<MangaChapter>("NewWeebCentralItemTopic");

// Message topic for last known Mangadex API status
export const MangadexPulseTopic = new MessengerTopic<MangadexPulse>("MangadexPulse");