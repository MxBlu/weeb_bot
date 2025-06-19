import { getModelForClass, index, prop } from "@typegoose/typegoose";

@index({ guildId: 1, roleId: 1 }, { unique: true })
export class NotifChannel {
  @prop({ required: true })
  guildId!: string;

  @prop({ required: true })
  roleId!: string;

  @prop({ required: true })
  channelId!: string;
}

export const NotifChannelModel = getModelForClass(NotifChannel);