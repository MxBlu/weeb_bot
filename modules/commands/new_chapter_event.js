const { sendMessage } = require("../../util/bot_utils");

module.exports = (discord, db, logger) => {
  return {
    newChapterHandler: async (topic, chapter) => {
      const guild = discord.guilds.cache.get(chapter.guild);
      if (guild == null) {
        logger.error(`Error: notifying for a guild no longer available: ${chapter.guild}`);
        return;
      }
  
      let channels = {};
      for (let roleId of chapter.roles) {
        let nc = await db.getNotifChannel(guild.id, roleId);
        if (nc == null) {
          continue;
        }
        if (nc in channels) {
          channels[nc].push(roleId);
        } else {
          channels[nc] = [ roleId ];
        }
      }
  
      for (let [channelId, roles] of Object.entries(channels)) {
        let channel = guild.channels.cache.get(channelId);
        let pingStr = roles.map(tr => `<@&${tr}>`).join(' ');
        let pagesStr = chapter.pageCount > 0 ? `- ${chapter.pageCount} pages ` : '';
  
        var msg = 
          `${chapter.title} ${pagesStr}${pingStr}\n` +
          `${chapter.link}`
        
        try {
          sendMessage(channel, msg); 
        } catch (e) {
          logger.error(`Failed to send notification to ${guild.id}@${channelId}: ${e}`);
        }
      }
    }
  }
}