const Parser = require('rss-parser');
const crypto = require('crypto');
const fetch = require('node-fetch');

// Feed requesting settings
const feedUrl = process.env.MANGEDEX_FEED_URL;
const refreshInterval = process.env.MANGEDEX_FEED_REFRESH_INTERVAL;
const dexDownHash = process.env.MANGADEX_DOWN_HASH;

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
      // Get content as HTML
      const response = await fetch(feedUrl);
      if (!response.ok) {
        throw `HTTPException: ${response.status} ${response.statusText}`;
      }
      const data = await response.text();

      // Compare against the hash of the known "down" page
      // 2021-03-21 incident patch
      let hash = crypto.createHash('sha512');
      hash.update(data);
      let dataHash = hash.digest('hex');
      logger.info(`Mangadex RSS hash: ${dataHash}`, 4);

      if (dexDownHash == dataHash) {
        throw `MangadexException: Dex is down`;
      }

      const feed = await rssParser.parseString(data);

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
      imm.notify('mangadexPulse', {
        status: true,
        lastUp: new Date(),
        lastDown: imm.getLastMessage('mangadexPulse')?.lastDown
      });
    } catch (e) {
      imm.notify('mangadexPulse', {
        status: false,
        lastUp: imm.getLastMessage('mangadexPulse')?.lastUp,
        lastDown: new Date()
      });
      logger.error(e);
    }
  }

  // Run timerTask at regular intervals 
  setInterval(timerTask, refreshInterval);
}