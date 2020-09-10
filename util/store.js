const fs            = require('fs');
const Redis         = require('ioredis');

/*
Using redis...
 - <guildId>_notifChannel: Integer
 - <guildId>_titles: Set() [ <titleId> ]
 - title_<titleId>: String
*/

module.exports = (redisHost, redisPort, logger) => {
  const rclient = new Redis(redisPort, redisHost);
  
  // Guilds can be ephemeral
  var guilds = new Set();

  rclient.on('error', (err) => {
    logger.error(`Redis error: ${err}`);
  });

  rclient.once('connect', () => {
    logger.info('Redis connected', 1);
  });

  return {

    getGuilds: async () => {
      return guilds;
    },

    addGuilds: async (...guildIds) => {
      guildIds.forEach((g) => guilds.add(g));
    },

    removeGuild: async (guildId) => {
      guilds.delete(guildId);
    },

    getNotifChannel: async (guildId) => {
      return rclient.get(`${guildId}_notifChannel`);
    },

    setNotifChannel: async (guildId, channelId) => {
      return rclient.set(`${guildId}_notifChannel`, channelId);
    },

    getTitles: async (guildId) => {
      return rclient.smembers(`${guildId}_titles`);
    },

    addTitle: async (guildId, titleId) => {
      return rclient.sadd(`${guildId}_titles`, titleId);
    },

    delTitle: async (guildId, titleId) => {
      return rclient.srem(`${guildId}_titles`, titleId);
    },

    clearTitles: async (guildId) => {
      return rclient.del(`${guildId}_titles`);
    },

    getTitleName: async (titleId) => {
      return rclient.get(`title_${titleId}`);
    },

    setTitleName: async (titleId) => {
      return rclient.set(`title_${titleId}`);
    }

  }
}