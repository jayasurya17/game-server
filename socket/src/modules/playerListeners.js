import Users from '../models/mongoDB/users'
import Game from '../models/mongoDB/game'
import GameMember from '../models/mongoDB/gameMember'
import PlayCard from '../../utils/playCard'
import DeclareRound from '../../utils/declareRound'
import { emitToUserUID, emitToUserId } from './emitter'
import { sysidConnected, userid_useruid, useruid_sysid, useruid_userid } from '../../utils/trackConnections'
import { emitLobbyDataToAllInGame, emitDataToAllInGame } from './sendUpdates'

var PlayerListeners = (socket) => {

	socket.on('drop-cards', async (authToken, body) => {

		const userUID = socket.handshake.userUID
		const email = socket.handshake.email
		let reqUserId = useruid_userid[userUID]

		try {
			if (!body.selected) {
				return socket.emit('common-game-data', "ERROR", "Please select cards that you wish to drop")
			} else if (!body.gameId) {
				return socket.emit('common-game-data', "ERROR", "Please Leave game and send us a message if this persists")
			} else if (!body.type) {
				return socket.emit('common-game-data', "ERROR", "Please Leave game and send us a message if this persists")
			}

			let gameMember = await GameMember.findOne({
				gameId: body.gameId,
				userId: reqUserId
			})

			let game = await Game.findOne({
				gameId: body.gameId
			})

			if (!game || !gameMember) {
				return socket.emit('common-game-data', "ERROR", "Please refresh. Leave game and send us a message if this persists")
			}

			var newCardsInHand = []
			var timestamp = Date.now()

			var activePlayers = await GameMember.find({
				gameId: body.gameId,
				isEliminated: false
			})
			var activePlayersIds = []
			for (var player of activePlayers) {
				activePlayersIds.push(player.userId.toString())
			}
			var nextPlayerIndex = (activePlayersIds.indexOf(reqUserId.toString()) + 1) % activePlayersIds.length
			var nextPlayer = activePlayersIds[nextPlayerIndex]

			// Validate if selected is part of what they have in hand
			var selected = []
			var cardValue = -1
			if (body.selected.length < 1) {
				return socket.emit('common-game-data', "ERROR", "No card selected to drop")
			}
			for (var temp of body.selected) {
				if (gameMember.currentCards.includes(parseInt(temp))) {
					if (cardValue == -1) {
						cardValue = parseInt(temp) % 13
					} else if (parseInt(temp) % 13 != cardValue) {
						return socket.emit('common-game-data', "ERROR", "You cannot drop cards of different values")
					}
					selected.push(parseInt(temp))
				} else {
					return socket.emit('common-game-data', "ERROR", "Please refresh. Leave game and send us a message if this persists")
				}
			}

			if (body.type === "Deck") {
				newCardsInHand = await PlayCard.fromDeck(game, gameMember, selected, timestamp, nextPlayer)
			} else if (body.type === "Table") {
				newCardsInHand = await PlayCard.fromTop(game, gameMember, selected, timestamp, nextPlayer)
			} else if (body.type === "Start") {
				newCardsInHand = await PlayCard.firstTurn(game, gameMember, selected, timestamp, nextPlayer)
			} else {
				return socket.emit('common-game-data', "ERROR", "Please refresh. Leave game and send us a message if this persists")
			}

			gameMember = await GameMember.findOne({
				gameId: body.gameId,
				userId: reqUserId
			})

			emitToUserUID(userUID, 'cards-in-hand', "SUCCESS", gameMember.currentCards)

			return await emitDataToAllInGame(body.gameId)

		} catch (err) {
			if (err.message) {
				return socket.emit('common-game-data', "ERROR", err.message)
			}
			return socket.emit('common-game-data', "ERROR", err)
		}

	})

	socket.on('declare', async (authToken, body) => {

		const userUID = socket.handshake.userUID
		const email = socket.handshake.email
		let reqUserId = useruid_userid[userUID]

		try {
			await DeclareRound(body.gameId, reqUserId, false)
			return await emitDataToAllInGame(body.gameId)

		} catch (err) {
			return socket.emit('common-game-data', "ERROR", err)
		}
	})

	socket.on('leave-game', async (authToken, body) => {

		const userUID = socket.handshake.userUID
		const email = socket.handshake.email
		let reqUserId = useruid_userid[userUID].toString()

		try {

			let game
			game = await Game.findOne({
				gameId: body.gameId
			})
			if (!game) {
				return socket.emit('common-game-data', "ERROR", "Please refresh. Leave game and send us a message if this persists")
			}

			if (reqUserId === game.createdUser.toString() && game.players.length === 1) {
				await Game.deleteOne({
					gameId: body.gameId
				})
			} else if (reqUserId === game.createdUser.toString()) {
				let newCreatedUser
				for (var player of game.players) {
					if (player.toString() != game.createdUser.toString()) {
						newCreatedUser = player
						break
					}
				}
				await Game.updateOne(
					{
						gameId: body.gameId
					},
					{
						$pull: {
							players: reqUserId
						},
						createdUser: newCreatedUser
					}
				)
				await emitDataToAllInGame(body.gameId)
			} else {
				await Game.updateOne(
					{
						gameId: body.gameId
					},
					{
						$pull: {
							players: reqUserId,
							waiting: reqUserId,
							spectators: reqUserId
						}
					}
				)
				await emitDataToAllInGame(body.gameId)
			}

			await GameMember.findOneAndUpdate(
				{
					gameId: body.gameId,
					userId: reqUserId
				},
				{
					didPlayerLeave: true
				}
			)

			return emitToUserUID(userUID, 'common-game-data', "LEAVE_GAME")
		} catch (err) {
			if (err.message) {
				return socket.emit('common-game-data', "ERROR", err.message)
			}
			return socket.emit('common-game-data', "ERROR", err)
		}
	})

	socket.on('reactions', async (authToken, body) => {
		const userUID = socket.handshake.userUID
		const email = socket.handshake.email
		let reqUserId = useruid_userid[userUID].toString()
		
		try {
			var game = await Game.findOne({ gameId: body.gameId })
			if (!game) {
				return socket.emit('reactions', "ERROR", "You are reacting to a game that does not exist")
			} else if (game.isStarted) {
				let playersInGame = game.players
				playersInGame = playersInGame.concat(game.waiting)
				playersInGame = playersInGame.concat(game.spectators)
				
				for (var id of playersInGame) {
					emitToUserId(id, 'reactions', 'SUCCESS', body)
				}
			} else {
				return socket.emit('reactions', "ERROR", "Please wait for the game to start")
			}
		} catch (err) {
			if (err.message) {
				return socket.emit('reactions', "ERROR", err.message)
			}
			return socket.emit('reactions', "ERROR", err)
		}
	})

	socket.on('get-game-updates', async (authToken, body) => {
		const userUID = socket.handshake.userUID
		const email = socket.handshake.email
		let reqUserId = useruid_userid[userUID].toString()

		try {
			var game = await Game.findOne({ gameId: body.gameId })
			if (!game) {
				return socket.emit('common-game-data', "ERROR", "Please refresh. Leave game and send us a message if this persists")
			}

			let gameMember = await GameMember.findOne({
				gameId: body.gameId,
				userId: reqUserId
			})

			if (gameMember) {
				socket.emit('cards-in-hand', "SUCCESS", gameMember.currentCards)
			}

			return await emitDataToAllInGame(body.gameId)
		} catch (err) {
			if (err.message) {
				return socket.emit('common-game-data', "ERROR", err.message)
			}
			return socket.emit('common-game-data', "ERROR", err)
		}
	})

	socket.on('get-lobby-updates', async (authToken, body) => {
		const userUID = socket.handshake.userUID
		const email = socket.handshake.email
		let reqUserId = useruid_userid[userUID].toString()

		try {
			var game = await Game.findOne({ gameId: body.gameId })
			if (!game) {
				return socket.emit('common-game-data', "ERROR", "Please refresh. Leave game and send us a message if this persists")
			}

			let gameMember = await GameMember.findOne({
				gameId: body.gameId,
				userId: reqUserId
			})

			return await emitLobbyDataToAllInGame(body.gameId)
		} catch (err) {
			if (err.message) {
				return socket.emit('common-game-data', "ERROR", err.message)
			}
			return socket.emit('common-game-data', "ERROR", err)
		}
	})

}

export default PlayerListeners