const mangadex = require('../util/mangadex');

module.exports = (db, imm, logger) => {

  async function itemHandler(topic, item) {
    // Extract title ID from RSS item
    const titleId = mangadex.parseUrl(item.mangaLink);
    if (titleId == null) {
      logger.error(`Item has invalid mangaLink: ${item.title}`);
      return;
    }
    
    // Check whether the manga has a existing subscription
    const subscribedTitles = db.getValue('titles');
    if (!subscribedTitles.has(titleId)) {
      return;
    }
    
    logger.info(`New subscribed chapter: ${item.title}`, 2)
    imm.notify('newChapter', {
      title: item.title,
      link: item.link
    });
  }

  imm.subscribe('newFeedItem', itemHandler);
}