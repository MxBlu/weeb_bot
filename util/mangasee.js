const fetch = require('node-fetch');
const fs = require('fs/promises');

const MANGASEE_URL = "https://mangasee123.com";

exports.getLatestChapters = async function (fromDate) {
  // Get title page
  const response = await fetch(MANGASEE_URL);
  if (!response.ok) {
    throw `HTTPException: ${response.status} ${response.statusText}`;
  }

  // Extract LatestJSON variable, containing new chapters
  const data = await response.text();
  const json_match = data.match(/vm\.LatestJSON = (\[.+?\]);/);
  const latestChapters = JSON.parse(json_match[1]);

  // Optionally filter it down to the be from a given date
  if (fromDate == null) {
    // Convert date strings to Date objects and add extra data
    //  (Chapter number, link)
    latestChapters.forEach(c => {
      c.Date = new Date(c.Date);
      c.ChapterNumber = getChapterNumber(c.Chapter);
      c.Link = createMangaseeLink(c);
    });
    return latestChapters;
  } else {
    // Assumes latestChapters is already sorted
    // Find the index of first date past our desired, then slice the array

    // Change the date strings to Date objects as we go
    // Might as well set the Link url and chapter number here too
    const firstIndexPastDate = latestChapters.findIndex(c => {
      c.Date = new Date(c.Date);
      c.ChapterNumber = getChapterNumber(c.Chapter);
      c.Link = createMangaseeLink(c);
      return c.Date < fromDate;
    });
    return latestChapters.slice(0, firstIndexPastDate);
  }
}

// /read-online/{{Chapter.IndexName}}{{vm.ChapterURLEncode(Chapter.Chapter)}}-page-1.html
function createMangaseeLink(seriesChapter) {
  return `${MANGASEE_URL}/read-online/${seriesChapter.IndexName}${ChapterURLEncode(seriesChapter.Chapter)}-page-1.html`;
}

// Copied from Mangasee index.html
function ChapterURLEncode(ChapterString){
  Index = "";
  var IndexString = ChapterString.substring(0, 1);
  if(IndexString != 1){
    Index = "-index-"+IndexString;
  }

  var Chapter = parseInt(ChapterString.slice(1,-1));

  var Odd = "";
  var OddString = ChapterString[ChapterString.length -1];
  if(OddString != 0){
    Odd = "." + OddString;
  }
  
  return "-chapter-" + Chapter + Odd + Index;
};

// Dervied from ChapterURLEncode
function getChapterNumber(ChapterString) {
  return parseInt(ChapterString.slice(1,-1));
}