const mangadex = require('./mangadex');

// Try parsing the url using all known formats
// Returns { id, title }
exports.parseUrl = async function (url) {

  // Try Mangadex
  let mangadex_id = mangadex.parseTitleUrl(url);
  if (mangadex_id != null) {
    let title = await mangadex.getMangaTitle(mangadex_id);
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