import { getModelForClass, prop } from "@typegoose/typegoose";
import { ScraperType } from "../constants/scraper_types.js";

export class ScraperStatus {
  @prop({ required: true })
  scraperType!: ScraperType;

  @prop({ required: true, default: true })
  enabled: boolean;
}

export const ScraperStatusModel = getModelForClass(ScraperStatus);