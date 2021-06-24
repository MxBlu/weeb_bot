import { MangaChapter } from "./MangaChapter.js";

export class MangaAlert {
  mangaChapter: MangaChapter;
  mangaTitle: string;
  guildId: string;
  rolesIds: Set<string>;
}