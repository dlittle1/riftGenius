const playerService = require('../../services/player');

/**
 * Render the player search form
 */
exports.searchForm = (req, res) => {
  res.render('player', { 
    title: 'Search Player',
    regions: [
      { id: 'na1', name: 'North America' },
      { id: 'euw1', name: 'Europe West' },
      { id: 'eun1', name: 'Europe Nordic & East' },
      { id: 'kr', name: 'Korea' },
      { id: 'jp1', name: 'Japan' },
      { id: 'br1', name: 'Brazil' },
      { id: 'la1', name: 'Latin America North' },
      { id: 'la2', name: 'Latin America South' },
      { id: 'oc1', name: 'Oceania' },
      { id: 'ru', name: 'Russia' },
      { id: 'tr1', name: 'Turkey' }
    ]
  });
};

/**
 * Search for a player by Riot ID (gameName + tagLine)
 */
exports.searchPlayer = async (req, res, next) => {
  try {
    const { region, riotId } = req.body;
    
    if (!region || !riotId) {
      return res.render('player', { 
        error: 'Region and Riot ID are required',
        regions: req.regions
      });
    }
    
    // Parse Riot ID (gameName#tagLine)
    const [gameName, tagLine] = riotId.split('#');
    
    if (!gameName || !tagLine) {
      return res.render('player', { 
        error: 'Invalid Riot ID format. Use GameName#TagLine',
        regions: req.regions
      });
    }
    
    // Redirect to player profile page
    res.redirect(`/player/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get player profile by region and Riot ID
 */
exports.getPlayerProfile = async (req, res, next) => {
  try {
    const { region, gameName, tagLine } = req.params;
    
    // Fetch player account data
    const accountData = await playerService.getAccountByRiotId(region, decodeURIComponent(gameName), decodeURIComponent(tagLine));
    
    if (!accountData) {
      return res.render('player', { 
        error: 'Player not found',
        regions: req.regions
      });
    }
    
    // Fetch player summoner data
    const summonerData = await playerService.getSummonerByPuuid(region, accountData.puuid);
    
    // Render player profile with account and summoner data
    res.render('player', {
      title: `${accountData.gameName}#${accountData.tagLine} - Profile`,
      player: {
        ...accountData,
        ...summonerData,
        region
      }
    });
    
  } catch (error) {
    next(error);
  }
};