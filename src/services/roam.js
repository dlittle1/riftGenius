const { LANE_POSITIONS, ROAM_DISTANCE_THRESHOLD, MINIMUM_ROAM_DURATION, VALUE_METRICS, ROAM_VALUE_THRESHOLDS } = require('../config/constants');
const timelineUtils = require('../utils/timeline');

/**
 * Analyzes player roaming behavior in a match
 * @param {Object} match - Match data
 * @param {Object} timeline - Match timeline data
 * @param {number} participantId - The participant ID to analyze
 * @param {string} position - The player's assigned position/role
 * @return {Object} - Roaming analysis results
 */
async function analyzeRoaming(match, timeline, participantId, position) {
  // Initialize analysis results
  const analysis = {
    roams: [],
    summary: {
      totalRoams: 0,
      successfulRoams: 0,
      negativeRoams: 0,
      neutralRoams: 0,
      totalRoamTime: 0,
      totalGoldGained: 0,
      totalGoldLost: 0,
      totalXpGained: 0,
      totalXpLost: 0,
      netValue: 0
    }
  };

  // Skip if position not defined or is jungle (junglers don't "roam")
  if (!position || position === 'JUNGLE') {
    return analysis;
  }

  // Find the player's team
  const participant = match.info.participants.find(p => p.participantId === participantId);
  if (!participant) {
    return analysis;
  }
  
  const teamId = participant.teamId;
  const teamSide = teamId === 100 ? 'blueTeam' : 'redTeam';
  
  // Get expected lane positions based on role and team side
  const expectedLanePosition = LANE_POSITIONS[position][teamSide];
  
  // Process the timeline to detect roams
  const frames = timeline.info.frames;
  let currentRoam = null;
  
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const participantFrame = frame.participantFrames[participantId];
    
    // Skip if no position data
    if (!participantFrame || !participantFrame.position) {
      continue;
    }
    
    const { x, y } = participantFrame.position;
    const timestamp = frame.timestamp;
    
    // Check if player is in their lane
    const isInLane = isPositionInLane(x, y, expectedLanePosition);
    
    // Player just left lane - start tracking a new roam
    if (!isInLane && !currentRoam) {
      currentRoam = {
        startTime: timestamp,
        startFrame: i,
        startPosition: { x, y },
        endTime: null,
        endFrame: null,
        endPosition: null,
        duration: null,
        events: [],
        goldGained: 0,
        goldLost: 0,
        xpGained: 0, 
        xpLost: 0,
        netValue: 0,
        outcome: 'NEUTRAL'
      };
    }
    // Player returned to lane - complete the current roam
    else if (isInLane && currentRoam) {
      // Only count as a roam if it meets the minimum duration
      if (timestamp - currentRoam.startTime >= MINIMUM_ROAM_DURATION) {
        currentRoam.endTime = timestamp;
        currentRoam.endFrame = i;
        currentRoam.endPosition = { x, y };
        currentRoam.duration = currentRoam.endTime - currentRoam.startTime;
        
        // Extract events that occurred during the roam
        currentRoam.events = extractRoamEvents(
          timeline, 
          currentRoam.startFrame, 
          currentRoam.endFrame, 
          participantId
        );
        
        // Calculate value gained during roam
        const valueResults = calculateRoamValue(
          match,
          timeline, 
          currentRoam, 
          participantId, 
          teamId
        );
        
        currentRoam.goldGained = valueResults.goldGained;
        currentRoam.goldLost = valueResults.goldLost;
        currentRoam.xpGained = valueResults.xpGained;
        currentRoam.xpLost = valueResults.xpLost;
        currentRoam.netValue = valueResults.netValue;
        currentRoam.outcome = determineRoamOutcome(valueResults.netValue);
        
        // Add to roams list
        analysis.roams.push(currentRoam);
        
        // Update summary stats
        analysis.summary.totalRoams++;
        analysis.summary.totalRoamTime += currentRoam.duration;
        analysis.summary.totalGoldGained += currentRoam.goldGained;
        analysis.summary.totalGoldLost += currentRoam.goldLost;
        analysis.summary.totalXpGained += currentRoam.xpGained;
        analysis.summary.totalXpLost += currentRoam.xpLost;
        analysis.summary.netValue += currentRoam.netValue;
        
        if (currentRoam.outcome === 'POSITIVE' || currentRoam.outcome === 'GREAT') {
          analysis.summary.successfulRoams++;
        } else if (currentRoam.outcome === 'NEGATIVE') {
          analysis.summary.negativeRoams++;
        } else {
          analysis.summary.neutralRoams++;
        }
      }
      
      // Reset current roam
      currentRoam = null;
    }
  }
  
  // Calculate averages and percentages for summary
  if (analysis.summary.totalRoams > 0) {
    analysis.summary.avgRoamDuration = Math.round(analysis.summary.totalRoamTime / analysis.summary.totalRoams);
    analysis.summary.successRate = Math.round((analysis.summary.successfulRoams / analysis.summary.totalRoams) * 100);
    analysis.summary.avgNetValue = Math.round(analysis.summary.netValue / analysis.summary.totalRoams);
  }
  
  return analysis;
}

/**
 * Determines if a position is within the expected lane boundaries
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} lanePosition - Expected lane boundaries
 * @return {boolean} - True if position is in lane
 */
function isPositionInLane(x, y, lanePosition) {
  return (
    x >= lanePosition.minX &&
    x <= lanePosition.maxX &&
    y >= lanePosition.minY &&
    y <= lanePosition.maxY
  );
}

/**
 * Extracts relevant events that occurred during a roam
 * @param {Object} timeline - Match timeline data
 * @param {number} startFrame - Starting frame index
 * @param {number} endFrame - Ending frame index
 * @param {number} participantId - The participant ID
 * @return {Array} - List of events during the roam
 */
function extractRoamEvents(timeline, startFrame, endFrame, participantId) {
  const events = [];
  
  for (let i = startFrame; i <= endFrame; i++) {
    const frame = timeline.info.frames[i];
    
    // Skip if no events in this frame
    if (!frame.events || !frame.events.length) {
      continue;
    }
    
    // Filter for relevant events involving the player
    const relevantEvents = frame.events.filter(event => {
      // Champion kills
      if (event.type === 'CHAMPION_KILL') {
        return (
          event.killerId === participantId || 
          (event.assistingParticipantIds && event.assistingParticipantIds.includes(participantId))
        );
      }
      
      // Objectives
      if (['ELITE_MONSTER_KILL', 'BUILDING_KILL'].includes(event.type)) {
        return event.killerId === participantId;
      }
      
      // Other event types can be added as needed
      return false;
    });
    
    events.push(...relevantEvents);
  }
  
  return events;
}

/**
 * Calculates the value gained and lost during a roam
 * @param {Object} match - Match data
 * @param {Object} timeline - Match timeline data
 * @param {Object} roam - Roam data
 * @param {number} participantId - The participant ID
 * @param {number} teamId - The player's team ID
 * @return {Object} - Value calculations
 */
function calculateRoamValue(match, timeline, roam, participantId, teamId) {
  let goldGained = 0;
  let goldLost = 0;
  let xpGained = 0;
  let xpLost = 0;
  
  // Calculate gold and XP gained from events during roam
  roam.events.forEach(event => {
    if (event.type === 'CHAMPION_KILL') {
      if (event.killerId === participantId) {
        // Player got a kill
        goldGained += VALUE_METRICS.GOLD.KILL_BASE;
        xpGained += VALUE_METRICS.XP.KILL_BASE;
      } else if (event.assistingParticipantIds && event.assistingParticipantIds.includes(participantId)) {
        // Player got an assist
        goldGained += VALUE_METRICS.GOLD.ASSIST_BASE;
        xpGained += VALUE_METRICS.XP.KILL_BASE / 2; // Half XP for assist (approximate)
      }
    } else if (event.type === 'ELITE_MONSTER_KILL') {
      if (event.killerId === participantId || (event.killerTeamId && event.killerTeamId === teamId)) {
        // Player or team killed an objective
        if (event.monsterType === 'DRAGON') {
          goldGained += VALUE_METRICS.GOLD.OBJECTIVE_DRAGON;
        } else if (event.monsterType === 'RIFTHERALD') {
          goldGained += VALUE_METRICS.GOLD.OBJECTIVE_HERALD;
        } else if (event.monsterType === 'BARON_NASHOR') {
          goldGained += VALUE_METRICS.GOLD.OBJECTIVE_BARON;
        }
      }
    } else if (event.type === 'BUILDING_KILL') {
      if (event.killerId === participantId || (event.teamId && event.teamId === teamId)) {
        // Player or team destroyed a building
        if (event.buildingType === 'TOWER_BUILDING') {
          goldGained += VALUE_METRICS.GOLD.TOWER_LOCAL_GOLD;
        }
      }
    }
  });
  
  // Calculate gold and XP lost from missed minions in lane
  // We need to estimate minions that would have been in lane during the roam
  const roamDurationMinutes = roam.duration / (60 * 1000);
  
  // Approximate minions per minute (assuming normal wave spawns)
  const meleeMinionsMissed = Math.round(roamDurationMinutes * 6); // 3 per wave, 2 waves per minute
  const casterMinionsMissed = Math.round(roamDurationMinutes * 6); // 3 per wave, 2 waves per minute
  const cannonMinionsMissed = Math.round(roamDurationMinutes * 0.6); // 1 every 3 waves
  
  goldLost += (
    meleeMinionsMissed * VALUE_METRICS.GOLD.MINION_MELEE +
    casterMinionsMissed * VALUE_METRICS.GOLD.MINION_CASTER +
    cannonMinionsMissed * VALUE_METRICS.GOLD.MINION_CANNON
  );
  
  xpLost += (
    meleeMinionsMissed * VALUE_METRICS.XP.MINION_MELEE +
    casterMinionsMissed * VALUE_METRICS.XP.MINION_CASTER +
    cannonMinionsMissed * VALUE_METRICS.XP.MINION_CANNON
  );
  
  // Calculate net value
  // We weight gold and XP differently based on game phase
  // Early game - XP is more valuable
  // Late game - Gold is more valuable
  const gameTime = roam.startTime;
  let goldWeight = 1;
  let xpWeight = 1;
  
  if (gameTime < 15 * 60 * 1000) { // Early game (< 15 min)
    goldWeight = 0.8;
    xpWeight = 1.2;
  } else if (gameTime > 25 * 60 * 1000) { // Late game (> 25 min)
    goldWeight = 1.2;
    xpWeight = 0.8;
  }
  
  const netValue = 
    (goldGained * goldWeight) - (goldLost * goldWeight) +
    (xpGained * xpWeight) - (xpLost * xpWeight);
  
  return {
    goldGained,
    goldLost,
    xpGained,
    xpLost,
    netValue: Math.round(netValue)
  };
}

/**
 * Determines the outcome category of a roam based on net value
 * @param {number} netValue - Net value of the roam
 * @return {string} - Outcome category (NEGATIVE, NEUTRAL, POSITIVE, GREAT)
 */
function determineRoamOutcome(netValue) {
  if (netValue < ROAM_VALUE_THRESHOLDS.NEGATIVE) {
    return 'NEGATIVE';
  } else if (netValue < ROAM_VALUE_THRESHOLDS.NEUTRAL) {
    return 'NEUTRAL';
  } else if (netValue < ROAM_VALUE_THRESHOLDS.GREAT) {
    return 'POSITIVE';
  } else {
    return 'GREAT';
  }
}

module.exports = {
  analyzeRoaming
};