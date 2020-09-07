
const mangadexTitleSyntax = /https?:\/\/(?:www\.)?mangadex\.org\/(?:title|manga)\/(\d+).*/;

exports.parseUrl = (url) => {
    const matchObj = url.match(mangadexTitleSyntax);
    if (matchObj == null || matchObj[1].length == 0) {
        return null;
    }
    return matchObj[1];
}

exports.toTitleUrl = (titleId) => {
    return `https://mangadex.org/title/${titleId}/`;
}