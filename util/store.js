const Redis         = require('ioredis');

/*
  Storage backend using Redis for persistence
  Guilds are stored in an ephemeral fashion, since the source of truth is Discord itself

  Store format:
 - <guildId>_roles: Set() [ <roleId> ]
 - <guildId>_<roleId>_name: String
 - <guildId>_<roleId>_notifChannel: String
 - <guildId>_<roleId>_titles: Set() [ <titleId> ]
 - title_<titleId>: String
*/

// Initialise with Redis credentials and logger
module.exports = (redisHost, redisPort, logger) => {
  // Redis client
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

    // Return guilds set
    getGuilds: () => {
      return guilds;
    },

    // Add all args as guilds to guild set
    addGuilds: (...guildIds) => {
      guildIds.forEach((g) => guilds.add(g));
    },

    // Remove guild from guild set
    removeGuild: (guildId) => {
      guilds.delete(guildId);
    },

    // Fetch roles from db for a given guild, returns set
    getRoles: async (guildId) => {
      return new Set(await rclient.smembers(`${guildId}_roles`));
    },

    // Add role to db for a given guild
    addRole: async (guildId, roleId) => {
      return rclient.sadd(`${guildId}_roles`, roleId);
    },

    // Delete role from db for a given guild
    delRole: async (guildId, roleId) => {
      return rclient.srem(`${guildId}_roles`, roleId);
    },

    // Get operating channel for a given role and guild
    getNotifChannel: async (guildId, roleId) => {
      return rclient.get(`${guildId}_${roleId}_notifChannel`);
    },

    // Set operating channel for a given role and guild
    setNotifChannel: async (guildId, roleId, channelId) => {
      return rclient.set(`${guildId}_${roleId}_notifChannel`, channelId);
    },
    
    // Delete operating channel for a given role and guild
    delNotifChannel: async (guildId, roleId) => {
      return rclient.del(`${guildId}_${roleId}_notifChannel`);
    },

    // Fetch alertable titles for a given role and guild, returns set
    getTitles: async (guildId, roleId) => {
      return new Set(await rclient.smembers(`${guildId}_${roleId}_titles`));
    },

    // Add alertable title for a given role and guild
    addTitle: async (guildId, roleId, titleId) => {
      return rclient.sadd(`${guildId}_${roleId}_titles`, titleId);
    },

    // Delete alertable title for a given role and guild
    delTitle: async (guildId, roleId, titleId) => {
      return rclient.srem(`${guildId}_${roleId}_titles`, titleId);
    },

    // Delete all alertable titles for a given role and guild
    clearTitles: async (guildId, roleId) => {
      return rclient.del(`${guildId}_${roleId}_titles`);
    },

    // Fetch title name for a given title id
    getTitleName: async (titleId) => {
      return rclient.get(`title_${titleId}`);
    },

    // Set title name for a given title id
    setTitleName: async (titleId, titleName) => {
      return rclient.set(`title_${titleId}`, titleName);
    },

    // Mangasee hackjobs

    // Check is Mangasee parsing is enabled
    isMangaseeEnabled: async () => {
      return await rclient.get('mangasee_enabled') == 'true';
    },

    // Set Mangasee parsing status
    setMangaseeEnabled: async (enabled) => {
      return rclient.set('mangasee_enabled', enabled == true ? 'true' : 'false');
    },

    // Get alternative titles (for Mangasee parsing) for a given titleId
    getAltTitles: async (titleId) => {
      return new Set(await rclient.smembers(`title_${titleId}_altTitles`));
    },

    // Add an alternative title for a given titleId
    addAltTitle: async (titleId, altTitle) => {
      await rclient.sadd(`title_${titleId}_altTitles`, altTitle);
      await rclient.set(`mangasee_altTitles_${altTitle}`, titleId);
      return;
    },

    // Delete an alternative title for a given titleId
    delTitle: async (titleId, altTitle) => {
      await rclient.srem(`title_${titleId}_altTitles`, altTitle);
      await rclient.del(`mangasee_altTitles_${altTitle}`, titleId);
      return;
    },

    // Get titleId for a given altTitle
    getTitleIdForAlt: async (altTitle) => {
      return await rclient.get(`mangasee_altTitles_${altTitle}`);
    }

  }
}