const mangadex = require('./mangadex');

// Try parsing the url using all known formats
// Returns { id, title }
exports.parseUrl = async function (db, url) {

  // Try Mangadex
  let mangadex_id = mangadex.parseTitleUrl(url);
  if (mangadex_id != null) {
    let title = '<Unknown>';
    try {
      title = await mangadex.getMangaTitle(mangadex_id);
    } catch (e) {
      // If it can't get it from Mangadex itself, try the db
      title = await db.getTitleName(mangadex_id);
    }
    return {
      id: mangadex_id,
      title: title
    };
  }

  // Try Steam
  // let steam_id = steamworks.parseSteamUrl(url);
  // if (steam_id != null) {
  //   let title = await steamworks.getAppTitle(steam_id);
  //   return {
  //     id: steam_id,
  //     title: title
  //   };
  // }

  // If we can't parse it, return null
  return null;
}