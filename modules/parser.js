const mangadex = require('../util/mangadex');

module.exports = (db, imm, logger) => {

  async function itemHandler(topic, item) {
    // Extract title ID from RSS item
    const titleId = mangadex.parseTitleUrl(item.mangaLink);
    const chapterId = mangadex.parseChaptereUrl(item.link);
    if (titleId == null) {
      logger.error(`Item has invalid mangaLink: ${item.title}`);
      return;
    }
    
    // Check whether the manga has a existing subscription
    const guilds = db.getGuilds();
    for (let guildId of guilds) {
      // If any guild has any roles that have subscribed to this manga
      // Notify for a new chapter with a list of roles subbed
      const roles = await db.getRoles(guildId);
      var rolesToAlert = new Set();
      for (let roleId of roles) {
        const titles = await db.getTitles(guildId, roleId);
        if (titles.has(titleId)) {
          rolesToAlert.add(roleId);
        }
      }
      if (rolesToAlert.size > 0) {
        logger.info(`New subscribed chapter for roles [ ${Array.from(rolesToAlert.values()).join(', ')} ] in guild ${guildId}: ` +
            `${item.title}`, 2);
        let pageCount = 0;
        try {
          pageCount = await mangadex.getChapterPageCount(chapterId);
        } catch (e) {
          logger.error(command.message, 'Mangadex connection issues, defaulting to 0 pages', 2);
        }
        imm.notify('newChapter', {
          title: item.title,
          pageCount: pageCount,
          guild: guildId,
          roles: rolesToAlert,
          link: item.link
        });
      }
    }
  }

  imm.subscribe('newFeedItem', itemHandler);
}