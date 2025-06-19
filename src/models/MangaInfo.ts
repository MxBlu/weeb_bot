import { getModelForClass, index, prop } from "@typegoose/typegoose";
import { ScraperType } from "../constants/scraper_types.js";

@index({ scraperType: 1, id: 1 }, { unique: true })
export class MangaInfo {
  @prop({ required: true })
  scraperType!: ScraperType;

  @prop({ required: true })
  id!: string;

  @prop()
  title?: string;
  
  @prop({ required: true, default: false })
  embedDisabled: boolean;
}

export const MangaInfoModel = getModelForClass(MangaInfo);