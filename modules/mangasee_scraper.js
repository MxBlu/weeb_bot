const Mangasee = require('../util/mangasee');

// Scraping settings
const refreshInterval = process.env.MANGASEE_REFRESH_INTERVAL;
const explicitlyDisabled = process.env.MANGASEE_DISABLED;

module.exports = (db, imm, logger) => {

  // Last fetch time, used for filtering
  let lastFetch = new Date();

  async function timerTask() {
    // Ensure the parser is enabled before continuing
    if (! await db.isMangaseeEnabled()) {
      return;
    }

    logger.info('Running Mangasee scraper', 4);
    try {
      const latestChapters = Mangasee.getLatestChapters(lastFetch);
      latestChapters.forEach(c => {
        // The logic we use in 'parser' is pulled here instead

        // Get the titleId for the series
        // If none exists, we don't have anything to go off to send notifications
        const titleId = db.getTitleIdForAlt(c.SeriesName);
        if (titleId == null) {
          return;
        }

        const title = `${c.SeriesName} - Chapter ${c.ChapterNumber}`;
        
        // Check whether the manga has a existing subscription
        // HINT: Someone should if we have a titleId....
        const guilds = db.getGuilds();
        for (let guildId of guilds) {
          // If any guild has any roles that have subscribed to this manga
          // Notify for a new chapter with a list of roles subbed
          const roles = await db.getRoles(guildId);
          const rolesToAlert = new Set();
          for (let roleId of roles) {
            const titles = await db.getTitles(guildId, roleId);
            if (titles.has(titleId)) {
              rolesToAlert.add(roleId);
            }
          }
          if (rolesToAlert.size > 0) {
            logger.info(`New subscribed chapter for roles [ ${Array.from(rolesToAlert.values()).join(', ')} ] in guild ${guildId}: ` +
                `${title}`, 2);
            imm.notify('newChapter', {
              title: title,
              pageCount: 0, // A Mangadex thing, no easy way for us to get it
              guild: guildId,
              roles: rolesToAlert,
              link: c.Link
            });
          }
        }
      });

      // Update last fetch time to now
      lastFetch = new Date();
    } catch (e) {
      logger.error(e);
    }
  }

  // Run timerTask at regular intervals 
  // If it has been explicitly disabled in env, don't
  if (explicitlyDisabled != 'true') {
    setInterval(timerTask, refreshInterval);
  }
}