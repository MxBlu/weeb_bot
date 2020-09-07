
const mangadexTitleSyntax = /https:\/\/mangadex\.org\/title\/(\d+)\/.+/;

exports.parseUrl = (url) => {
    const matchObj = url.match(mangadexTitleSyntax);
    if (matchObj == null || matchObj[1].length == 0) {
        return null;
    }
    return matchObj[1];
}