const Redis         = require('ioredis');

/*
Using redis...
 - <guildId>_roles: Set() [ <roleId> ]
 - <guildId>_<roleId>_name: String
 - <guildId>_<roleId>_notifChannel: Integer
 - <guildId>_<roleId>_titles: Set() [ <titleId> ]
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

    getGuilds: () => {
      return guilds;
    },

    addGuilds: (...guildIds) => {
      guildIds.forEach((g) => guilds.add(g));
    },

    removeGuild: (guildId) => {
      guilds.delete(guildId);
    },

    getRoles: async (guildId) => {
      return new Set(await rclient.smembers(`${guildId}_roles`));
    },

    addRole: async (guildId, roleId) => {
      return rclient.sadd(`${guildId}_roles`, roleId);
    },

    delRole: async (guildId, roleId) => {
      return rclient.srem(`${guildId}_roles`, roleId);
    },

    getNotifChannel: async (guildId, roleId) => {
      return rclient.get(`${guildId}_${roleId}_notifChannel`);
    },

    setNotifChannel: async (guildId, roleId, channelId) => {
      return rclient.set(`${guildId}_${roleId}_notifChannel`, channelId);
    },
    
    delNotifChannel: async (guildId, roleId) => {
      return rclient.del(`${guildId}_${roleId}_notifChannel`);
    },

    getTitles: async (guildId, roleId) => {
      return new Set(await rclient.smembers(`${guildId}_${roleId}_titles`));
    },

    addTitle: async (guildId, roleId, titleId) => {
      return rclient.sadd(`${guildId}_${roleId}_titles`, titleId);
    },

    delTitle: async (guildId, roleId, titleId) => {
      return rclient.srem(`${guildId}_${roleId}_titles`, titleId);
    },

    clearTitles: async (guildId, roleId) => {
      return rclient.del(`${guildId}_${roleId}_titles`);
    },

    getTitleName: async (titleId) => {
      return rclient.get(`title_${titleId}`);
    },

    setTitleName: async (titleId, titleName) => {
      return rclient.set(`title_${titleId}`, titleName);
    }

  }
}