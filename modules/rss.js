const Parser = require('rss-parser');

const feedUrl = process.env.MANGEDEX_FEED_URL;
const refreshInterval = process.env.MANGEDEX_FEED_REFRESH_INTERVAL;

module.exports = (imm, logger) => {

  const startTime = new Date();
  const guidSet = new Set();
  const rssParser = new Parser({
    customFields: {
      item: ['mangaLink']
    }
  });

  async function timerTask() {
    logger.info('Running RSS feed parser', 3);
    try {
      const feed = await rssParser.parseURL(feedUrl);

      feed.items.forEach((item) => {
        // No processing items we've seen or before we started
        let itemDate = new Date(item.isoDate);
        if (itemDate.getTime() < startTime.getTime() || 
            guidSet.has(item.guid)) {
          return;
        }
        logger.info(`Item: ${item.title}`, 4);
        guidSet.add(item.guid);

        logger.info(`New item: ${item.title}`, 3);
        imm.notify('newFeedItem', item);
      });
    } catch (e) {
      logger.error(e);
    }
  }

  setInterval(timerTask, refreshInterval);
}