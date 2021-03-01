const fetch = require('node-fetch');

// API URLS
const storefrontApiBase = 'https://store.steampowered.com/api';
const steamworksApiBase = 'https://api.steampowered.com';

// Regex to match URLs
const steamStoreSyntax = /https?:\/\/(?:www\.)?store\.steampowered\.com\/app\/(\d+).*/;

exports.parseSteamUrl = function (url) {
  const matchObj = url.match(steamStoreSyntax);
  if (matchObj == null || matchObj[1].length == 0) {
    return null;
  }
  return matchObj[1];
}

exports.getAppTitle = async function (appId) {
  let apiUrl = `${storefrontApiBase}/appdetails?appids=${appId}`;
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw `HTTPException: ${response.status} ${response.statusText}`;
  }
  const data = await response.json();
  if (data[`${appId}`].success == false) {
    throw `StorefrontException: Bad appId ${appId}`;
  }
  return data[`${appId}`].data.name;
}