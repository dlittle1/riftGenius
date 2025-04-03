const roamService = require('../../services/roam');
const matchService = require('../../services/match');
const playerService = require('../../services/player');

/**
 * Analyze a player's roaming behavior in a specific match
 */
exports.analyzeRoaming = async (req, res, next) => {
  try {
    const { region, matchId, puuid } = req.params;
    
    // Get match details
    const match = await matchService.getMatchDetails(region, matchId);
    
    // Get match timeline
    const timeline = await matchService.getMatchTimeline(region, matchId);
    
    if (!match || !timeline) {
      return res.status(404).render('error', { 
        message: 'Match data not found', 
        error: { status: 404 } 
      });
    }
    
    // Find the participant data for the requested player
    const participant = match.info.participants.find(p => p.puuid === puuid);
    
    if (!participant) {
      return res.status(404).render('error', { 
        message: 'Player not found in this match', 
        error: { status: 404 } 
      });
    }
    
    // Check if the player is in a lane role (not jungle)
    if (participant.individualPosition === 'JUNGLE') {
      return res.render('analysis', {
        title: 'Roaming Analysis',
        match,
        participant,
        error: 'Roaming analysis is only available for laners, not junglers'
      });
    }
    
    // Get player account info for display
    const accountInfo = await playerService.getAccountByPuuid(region, puuid);
    
    // Analyze roaming behavior
    const roamingAnalysis = await roamService.analyzeRoaming(
      match, 
      timeline, 
      participant.participantId,
      participant.individualPosition
    );
    
    // Render the analysis page
    res.render('analysis', {
      title: 'Roaming Analysis',
      match,
      timeline,
      participant,
      playerName: `${accountInfo.gameName}#${accountInfo.tagLine}`,
      roamingAnalysis
    });
    
  } catch (error) {
    console.error('Error during roaming analysis:', error);
    next(error);
  }
};