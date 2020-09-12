const Mangadex 		= require('mangadex-api');

// Regex for matching Mangadex urls
const mangadexTitleSyntax = /https?:\/\/(?:www\.)?mangadex\.org\/(?:title|manga)\/(\d+).*/;
const mangadexChapterSyntax = /https?:\/\/(?:www\.)?mangadex\.org\/chapter\/(\d+).*/;

// Extract id out of a Mangadex title url
// Returns null if invalid
exports.parseTitleUrl = (url) => {
	const matchObj = url.match(mangadexTitleSyntax);
	if (matchObj == null || matchObj[1].length == 0) {
		return null;
	}
	return matchObj[1];
}

// Extract id out of a Mangadex chapter url
// Returns null if invalid
exports.parseChaptereUrl = (url) => {
	const matchObj = url.match(mangadexChapterSyntax);
	if (matchObj == null || matchObj[1].length == 0) {
		return null;
	}
	return matchObj[1];
}


// Use API to get title of a manga, given id
// Will throw an exception if API returns an invalid response
exports.getMangaTitle = async (titleId) => {
	const details = await Mangadex.getManga(parseInt(titleId));
	return details.manga.title;
}

// Use API to get page count of a chapter, given id
// Will throw an exception if API returns an invalid response
exports.getChapterPageCount = async (chapterId) => {
	const details = await Mangadex.getChapter(parseInt(chapterId));
	return details.page_array.length;
}

// Returns a manga url given an id 
exports.toTitleUrl = (titleId) => {
	return `https://mangadex.org/title/${titleId}/`;
}