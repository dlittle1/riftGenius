// League of Legends constants for analysis

// Roles/Positions
const POSITIONS = {
    TOP: 'TOP',
    JUNGLE: 'JUNGLE', 
    MIDDLE: 'MIDDLE',
    BOTTOM: 'BOTTOM',
    UTILITY: 'UTILITY' // Support
  };
  
  // Lane positions on the map (for detecting roaming)
  const LANE_POSITIONS = {
    TOP: {
      blueTeam: { minX: 0, maxX: 14870, minY: 8000, maxY: 14870 },
      redTeam: { minX: 0, maxX: 6800, minY: 8000, maxY: 14870 }
    },
    MIDDLE: {
      blueTeam: { minX: 5000, maxX: 9870, minY: 5000, maxY: 9870 },
      redTeam: { minX: 5000, maxX: 9870, minY: 5000, maxY: 9870 }
    },
    BOTTOM: {
      blueTeam: { minX: 0, maxX: 6800, minY: 0, maxY: 6800 },
      redTeam: { minX: 8000, maxX: 14870, minY: 0, maxY: 6800 }
    }
  };
  
  // Time thresholds for early/mid/late game (in milliseconds)
  const GAME_PHASES = {
    EARLY_GAME: 15 * 60 * 1000, // 0-15 minutes
    MID_GAME: 25 * 60 * 1000,   // 15-25 minutes
    LATE_GAME: Infinity         // 25+ minutes
  };
  
  // Minimum distance to be considered "roaming" from lane
  const ROAM_DISTANCE_THRESHOLD = 2000;
  
  // Minimum time away from lane to be considered a roam (in milliseconds)
  const MINIMUM_ROAM_DURATION = 25 * 1000; // 25 seconds
  
  // Value metrics
  const VALUE_METRICS = {
    // Gold values
    GOLD: {
      MINION_MELEE: 21,
      MINION_CASTER: 14,
      MINION_CANNON: 60,
      MINION_SUPER: 90,
      KILL_BASE: 300,
      ASSIST_BASE: 150,
      TOWER_LOCAL_GOLD: 150,
      OBJECTIVE_HERALD: 100,
      OBJECTIVE_DRAGON: 25,
      OBJECTIVE_BARON: 300
    },
    
    // Experience values
    XP: {
      MINION_MELEE: 64,
      MINION_CASTER: 32,
      MINION_CANNON: 92,
      MINION_SUPER: 97,
      KILL_BASE: 60 // Base XP + level scaling 
    }
  };
  
  // Roam "worthiness" thresholds
  const ROAM_VALUE_THRESHOLDS = {
    NEGATIVE: -300,  // Lost significantly more than gained
    NEUTRAL: -50,    // Roughly equal trade
    POSITIVE: 0,     // Small gain
    GREAT: 300       // Significant gain
  };
  
  module.exports = {
    POSITIONS,
    LANE_POSITIONS,
    GAME_PHASES,
    ROAM_DISTANCE_THRESHOLD,
    MINIMUM_ROAM_DURATION,
    VALUE_METRICS,
    ROAM_VALUE_THRESHOLDS
  };