const express = require('express');
const router = express.Router();

// Import controllers
const playerController = require('./controllers/player');
const matchController = require('./controllers/match');
const roamController = require('./controllers/roam');

// Home page route
router.get('/', (req, res) => {
  res.render('index', { title: 'RiftGenius - League of Legends Roaming Analysis' });
});

// Player routes
router.get('/player', playerController.searchForm);
router.post('/player/search', playerController.searchPlayer);
router.get('/player/:region/:gameName/:tagLine', playerController.getPlayerProfile);

// Match routes
router.get('/matches/:region/:puuid', matchController.getMatchHistory);
router.get('/match/:region/:matchId', matchController.getMatchDetails);

// Roam analysis routes
router.get('/analysis/:region/:matchId/:puuid', roamController.analyzeRoaming);

module.exports = router;