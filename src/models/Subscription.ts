import { getModelForClass, index, prop } from "@typegoose/typegoose";
import { ScraperType } from "../constants/scraper_types.js";

@index({ scraperType: 1, subscribableId: 1 })
@index({ guildId: 1, roleId: 1, scraperType: 1 })
export class Subscription {
  @prop({ required: true })
  guildId!: string;

  @prop({ required: true })
  roleId!: string;
  
  @prop({ required: true })
  scraperType!: ScraperType;

  @prop({ required: true })
  titleId!: string;
}

export const SubscriptionModel = getModelForClass(Subscription);