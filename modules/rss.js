const Parser = require('rss-parser');

// Feed requesting settings
const feedUrl = process.env.MANGEDEX_FEED_URL;
const refreshInterval = process.env.MANGEDEX_FEED_REFRESH_INTERVAL;

module.exports = (imm, logger) => {

  // Start time, used for filtering
  const startTime = new Date();

  // Set of GUIDs seen, used for filtering
  const guidSet = new Set();

  // Customised parser for mangadex entries
  const rssParser = new Parser({
    customFields: {
      item: ['mangaLink']
    }
  });

  async function timerTask() {
    logger.info('Running RSS feed parser', 4);
    try {
      const feed = await rssParser.parseURL(feedUrl);

      feed.items.forEach((item) => {
        // No processing items we've seen or before we started
        let itemDate = new Date(item.isoDate);
        if (itemDate.getTime() < startTime.getTime() || 
            guidSet.has(item.guid)) {
          return;
        }
        guidSet.add(item.guid);

        logger.info(`New item: ${item.title}`, 3);
        imm.notify('newFeedItem', item);
      });
    } catch (e) {
      logger.error(e);
    }
  }

  // Run timerTask at regular intervals 
  setInterval(timerTask, refreshInterval);
}