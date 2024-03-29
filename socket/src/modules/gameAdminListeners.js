import Users from '../models/mongoDB/users'
import Game from '../models/mongoDB/game'
import GameMember from '../models/mongoDB/gameMember'
import { getCards, shuffle } from '../../utils/getCards'
import { emitToUserUID, emitToUserId } from './emitter'
import { sysidConnected, userid_useruid, useruid_sysid, useruid_userid } from '../../utils/trackConnections'
import { emitLobbyDataToAllInGame, emitDataToAllInGame } from './sendUpdates'


var GameAdminListers = (socket) => {

	socket.on('start-game', async (authToken, body) => {

		const userUID = socket.handshake.userUID
		const email = socket.handshake.email
		let reqUserId = useruid_userid[userUID]
		let gameId = body.gameId

		try {

			let game
			game = await Game.findOne({
				gameId: gameId
			})
			if (!game) {
				return socket.emit("lobby-listener", "ERROR", "Game does not exist")
			} else if (game.players.length < 2) {
				return socket.emit("lobby-listener", "ERROR", "Not enough players to start the game")
			} else if (game.isStarted === true) {
				return emitToUserUID(userUID, "lobby-listener", "GAME_STARTED")
			} else if (game.createdUser.toString() != reqUserId) {
				return socket.emit("lobby-listener", "ERROR", "Only game admin can start the game")
			}

			var availableCards = []
			for (var index = 1; index < 53; index++) {
				availableCards.push(index)
			}

			var startedUser = null
			for (var userId of game.players) {
				let result, cardsForPlayer
				let userObj = await Users.findByIdAndUpdate(
					userId,
					{
						$inc: {
							totalGames: 1
						}
					}
				)
				if (game.createdUser.toString() == userId.toString()) {
					startedUser = userObj.userName
					result = getCards(availableCards, 6)
				} else {
					result = getCards(availableCards, 5)
				}
				cardsForPlayer = result.cardsForPlayer;
				availableCards = result.availableCards;
				let gameMemberObj = new GameMember({
					gameId: gameId,
					userId: userId,
					userName: userObj.userName,
					currentCards: cardsForPlayer
				})
				await gameMemberObj.save()
			}
			let timestamp = Date.now()
			shuffle(availableCards)
			game = await Game.findOneAndUpdate(
				{
					gameId: gameId
				},
				{
					currentPlayer: game.createdUser,
					isStarted: true,
					cardsInDeck: availableCards,
					lastPlayedTime: timestamp,
					previousDroppedPlayer: startedUser,
					lastPlayedAction: "will start the game"
				}
			)

			if (game) {
				return await emitLobbyDataToAllInGame(gameId)
			}

			return socket.emit("lobby-listener", "ERROR", "Could not start game")

		} catch (error) {
			if (error.message) {
				return socket.emit('lobby-listener', "ERROR", error.message)
			}
			return socket.emit('lobby-listener', "ERROR", error)
		}

	})

	socket.on('next-round', async (authToken, body) => {
		const userUID = socket.handshake.userUID
		const email = socket.handshake.email
		let reqUserId = useruid_userid[userUID]

		try {

			let game
			game = await Game.findOne({
				gameId: body.gameId
			})
			if (!game) {
				return socket.emit('common-game-data', "ERROR", "Invalid game id")
			} else if (game.isEnded) {
				return socket.emit('common-game-data', "ERROR", "Game has ended")
			} else if (!game.isRoundComplete) {
				return socket.emit('common-game-data', "ERROR", "Cannot restart while game is active")
			}

			var availableCards = []
			for (var index = 1; index < 53; index++) {
				availableCards.push(index)
			}

			shuffle(availableCards)
			var allPlayers = await GameMember.find({
				gameId: body.gameId
			})
			var activePlayers = []
			for (var player of allPlayers) {
				if (player.isEliminated) {
					await GameMember.findByIdAndUpdate(
						player._id,
						{
							currentCards: []
						}
					)
				} else {
					activePlayers.push(player)
				}
			}
			var nextPlayerToStart = activePlayers[game.roundsComplete % activePlayers.length]
			var nextUserNameToStart = nextPlayerToStart.userName
			var nextUserIdToStart = nextPlayerToStart.userId

			var result,
				cardsForPlayer,
				createdUserCards
			for (var player of activePlayers) {

				if (nextUserIdToStart == player.userId) {
					result = getCards(availableCards, 6)
				} else {
					result = getCards(availableCards, 5)
				}
				cardsForPlayer = result.cardsForPlayer;
				availableCards = result.availableCards;

				if (game.createdUser.toString() == player.userId.toString()) {
					createdUserCards = cardsForPlayer
				}
				await GameMember.findByIdAndUpdate(
					player._id,
					{
						hasPlayerDroppedCards: false,
						currentCards: cardsForPlayer
					}
				)
				emitToUserId(player.userId, "cards-in-hand", "SUCCESS", cardsForPlayer)
			}

			let timestamp = Date.now()
			game = await Game.findOneAndUpdate(
				{
					gameId: body.gameId
				},
				{
					currentPlayer: nextUserIdToStart,
					isRoundComplete: false,
					previousDroppedCards: [],
					cardsInDeck: availableCards,
					lastPlayedTime: timestamp,
					previousDroppedPlayer: nextUserNameToStart,
					lastPlayedAction: "will start the next round"
				}
			)

			if (game) {
				return await emitDataToAllInGame(body.gameId)
			}

			return socket.emit('common-game-data', "ERROR", "Please refresh. Leave game and send us a message if this persists")

		} catch (error) {
			if (error.message) {
				return socket.emit('common-game-data', "ERROR", error.message)
			}
			return socket.emit('common-game-data', "ERROR", error)
		}
	})

	socket.on('restart-game', async (authToken, body) => {

		const userUID = socket.handshake.userUID
		const email = socket.handshake.email
		let reqUserId = useruid_userid[userUID]

		try {

			let oldGame = await Game.findOne({
				gameId: body.gameId
			})
			if (!oldGame) {
				return socket.emit('common-game-data', "ERROR", "Game does not exist")
			} else if (oldGame.isEnded != true) {
				return socket.emit('common-game-data', "ERROR", "Game cannot be restarted until it has ended")
			} else if (oldGame.players.length + oldGame.waiting.length < 2) {
				return socket.emit('common-game-data', "ERROR", "Not enough players to restart the game")
			} else if (oldGame.createdUser.toString() != reqUserId) {
				return socket.emit('common-game-data', "ERROR", "Only game admin can restart the game")
			}

			let timestamp = Date.now()
			await Game.deleteOne({
				gameId: body.gameId
			})

			await GameMember.deleteMany({
				gameId: body.gameId
			})

			var availableCards = []
			for (var index = 1; index < 53; index++) {
				availableCards.push(index)
			}
			shuffle(availableCards)

			let playersInNextGame = oldGame.players.concat(oldGame.waiting)
			shuffle(playersInNextGame)
			let randomPlayerOrder = playersInNextGame
			const newGameData = new Game({
				players: randomPlayerOrder,
				spectators: oldGame.spectators,
				gameId: body.gameId,
				createdUser: oldGame.createdUser,
				currentPlayer: randomPlayerOrder[0],
				cardsInDeck: [],
				openedCards: [],
				previousDroppedCards: [],
				previousDroppedPlayer: " ",
				lastPlayedTime: " ",
				lastPlayedAction: " ",
				maxScore: oldGame.maxScore,
				endWithPair: oldGame.endWithPair,
				wrongCall: oldGame.wrongCall,
				canDeclareFirstRound: oldGame.canDeclareFirstRound,
				autoplayTimer: oldGame.autoplayTimer,
				isPublicGame: oldGame.isPublicGame
			})
			let newGame = await newGameData.save()

			var startedUser = null
			var createdUserCards = []
			for (var userId of newGame.players) {
				let result, cardsForPlayer
				let userObj = await Users.findByIdAndUpdate(
					userId,
					{
						$inc: {
							totalGames: 1
						}
					}
				)
				if (newGame.currentPlayer.toString() == userId.toString()) {
					startedUser = userObj.userName
					result = getCards(availableCards, 6)
				} else {
					result = getCards(availableCards, 5)
				}
				cardsForPlayer = result.cardsForPlayer;
				availableCards = result.availableCards;

				if (newGame.createdUser.toString() == userId.toString()) {
					createdUserCards = cardsForPlayer
				}

				let gameMemberObj = new GameMember({
					gameId: body.gameId,
					userId: userId,
					userName: userObj.userName,
					currentCards: cardsForPlayer
				})
				await gameMemberObj.save()
				emitToUserId(userId, "cards-in-hand", "SUCCESS", cardsForPlayer)
			}

			let game = await Game.findOneAndUpdate(
				{
					gameId: body.gameId
				},
				{
					isStarted: true,
					cardsInDeck: availableCards,
					lastPlayedTime: timestamp,
					previousDroppedPlayer: startedUser,
					lastPlayedAction: "will start the game"
				}
			)

			if (game) {
				return await emitDataToAllInGame(body.gameId)
			}

			return socket.emit('common-game-data', "ERROR", "Please refresh. Leave game and send us a message if this persists")


		} catch (error) {
			if (error.message) {
				return socket.emit('common-game-data', "ERROR", error.message)
			}
			return socket.emit('common-game-data', "ERROR", error)
		}
	})

	socket.on('remove-player', async (authToken, body) => {

		const userUID = socket.handshake.userUID
		const email = socket.handshake.email
		let reqUserId = useruid_userid[userUID].toString()

		try {

			let game
			game = await Game.findOne({
				gameId: body.gameId
			})
			if (!game) {
				return socket.emit('common-game-data', "ERROR", "Invalid game id")
			}

			if (reqUserId !== game.createdUser.toString()) {
				return socket.emit('common-game-data', "ERROR", "Only game admin can remove players")
			} else if (body.userId.toString() === game.createdUser.toString()) {
				return socket.emit('common-game-data', "ERROR", "Cannot remove yourself from game. Please leave game")
			} else {
				await Game.updateOne(
					{
						gameId: body.gameId
					},
					{
						$pull: {
							players: body.userId
						}
					}
				)
				await GameMember.updateOne(
					{
						gameId: body.gameId,
						userId: body.userId
					},
					{
						didPlayerLeave: true
					}
				)
			}

			let removePlayerUID, removePlayerSysId, removePlayerSocket
			if (body.userId in userid_useruid) {
				removePlayerUID = userid_useruid[body.userId]
			}
			if (removePlayerUID in useruid_sysid) {
				removePlayerSysId = useruid_sysid[removePlayerUID]
				removePlayerSysId = [...removePlayerSysId]
				for (var sysid of removePlayerSysId) {
					removePlayerSocket = sysidConnected[sysid]["socket"]
					removePlayerSocket.emit('common-game-data', "LEAVE_GAME")
				}
			}
			
			return await emitDataToAllInGame(body.gameId)
		} catch (err) {
			if (err.message) {
				return socket.emit('common-game-data', "ERROR", err.message)
			}
			return socket.emit('common-game-data', "ERROR", err)
		}
	})

}

export default GameAdminListers