const axios = require('axios');

// Riot API base URLs
const REGION_URLS = {
  // Americas
  'na1': 'https://na1.api.riotgames.com',
  'br1': 'https://br1.api.riotgames.com',
  'la1': 'https://la1.api.riotgames.com',
  'la2': 'https://la2.api.riotgames.com',
  // Europe
  'euw1': 'https://euw1.api.riotgames.com',
  'eun1': 'https://eun1.api.riotgames.com',
  'tr1': 'https://tr1.api.riotgames.com',
  'ru': 'https://ru.api.riotgames.com',
  // Asia
  'jp1': 'https://jp1.api.riotgames.com',
  'kr': 'https://kr.api.riotgames.com',
  'oc1': 'https://oc1.api.riotgames.com',
};

// Regional routing values for APIs that require them
const REGIONAL_ROUTING = {
  'na1': 'americas',
  'br1': 'americas',
  'la1': 'americas',
  'la2': 'americas',
  'euw1': 'europe',
  'eun1': 'europe',
  'tr1': 'europe',
  'ru': 'europe',
  'jp1': 'asia',
  'kr': 'asia',
  'oc1': 'asia',
};

// Account v1 API
const ACCOUNT_API = {
  byRiotId: (region, gameName, tagLine) => 
    `https://${REGIONAL_ROUTING[region]}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
  byPuuid: (region, puuid) => 
    `https://${REGIONAL_ROUTING[region]}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`
};

// Summoner v4 API
const SUMMONER_API = {
  byPuuid: (region, puuid) => 
    `${REGION_URLS[region]}/lol/summoner/v4/summoners/by-puuid/${puuid}`,
  byId: (region, summonerId) => 
    `${REGION_URLS[region]}/lol/summoner/v4/summoners/${summonerId}`
};

// Match v5 API
const MATCH_API = {
  byPuuid: (region, puuid, count = 20) => 
    `https://${REGIONAL_ROUTING[region]}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`,
  byMatchId: (region, matchId) => 
    `https://${REGIONAL_ROUTING[region]}.api.riotgames.com/lol/match/v5/matches/${matchId}`,
  timelineByMatchId: (region, matchId) => 
    `https://${REGIONAL_ROUTING[region]}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`
};

// Create an Axios instance with default headers
const riotApi = axios.create({
  headers: {
    'X-Riot-Token': process.env.RIOT_API_KEY
  }
});

module.exports = {
  REGION_URLS,
  REGIONAL_ROUTING,
  ACCOUNT_API,
  SUMMONER_API,
  MATCH_API,
  riotApi
};