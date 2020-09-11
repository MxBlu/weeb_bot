const Mangadex = require('mangadex-api');

const mangadexTitleSyntax = /https?:\/\/(?:www\.)?mangadex\.org\/(?:title|manga)\/(\d+).*/;
const mangadexChapterSyntax = /https?:\/\/(?:www\.)?mangadex\.org\/chapter\/(\d+).*/;

exports.parseTitleUrl = (url) => {
	const matchObj = url.match(mangadexTitleSyntax);
	if (matchObj == null || matchObj[1].length == 0) {
		return null;
	}
	return matchObj[1];
}

exports.parseChaptereUrl = (url) => {
	const matchObj = url.match(mangadexChapterSyntax);
	if (matchObj == null || matchObj[1].length == 0) {
		return null;
	}
	return matchObj[1];
}

exports.getMangaTitle = async (titleId) => {
	const details = await Mangadex.getManga(parseInt(titleId));
	return details.manga.title;
}

exports.getChapterPageCount = async (chapterId) => {
	const details = await Mangadex.getChapter(parseInt(chapterId));
	return details.page_array.length;
}

exports.toTitleUrl = (titleId) => {
	return `https://mangadex.org/title/${titleId}/`;
}