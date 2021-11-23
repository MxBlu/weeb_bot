import { CommandInteraction } from "discord.js";

import { Store } from "../support/store.js";

export const checkIfSubscribed = async function (interaction: CommandInteraction): Promise<boolean> {
  const guild = interaction.guild;
  const channel = interaction.channel;
  const roles = await Store.getRoles(guild.id);

  for (const r of roles) {
    const nc = await Store.getNotifChannel(guild.id, r);
    if (nc == channel.id) {
      return true;
    }
  }
  
  return false;
}