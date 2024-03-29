`use strict`

import express from 'express';
import gameController from '../controller/game';

const router = express.Router();

router.post('/create', gameController.createGame);
router.post('/join', gameController.joinGame);
router.post('/spectate', gameController.spectateGame);
router.post('/quitFromLobby', gameController.quitFromLobby);
router.get('/public', gameController.getPublicGames);
router.get('/settings/:gameId', gameController.getGameSettings);

module.exports = router;
