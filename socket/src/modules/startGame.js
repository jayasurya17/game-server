import Game from '../models/mongoDB/game'
import GameMember from '../models/mongoDB/gameMember'
import Users from '../models/mongoDB/users'
import calculateScore from '../../utils/calculateScore'
import RoundStatus from '../../utils/roundStatus'
import { resolve } from 'path'

exports.getPlayersInGame = (gameId) => {
    return new Promise(async (resolve) => {
        let game = await Game.findOne({
            gameId: gameId
        })
        let users = []
        if (game) {
            for (var userId of game.players) {
                let player = await Users.findById(userId)
                users.push(player)
            }
            resolve({
                createdUser: game.createdUser,
                players: users,
                isStarted: game.isStarted
            })
        }
        resolve({
            players: users,
            isStarted: false
        })
    })
}


exports.getGameStatus = (gameId, userId) => {
    return new Promise(async (resolve) => {
        let game = await Game.findOne({
            gameId: gameId
        })

        let allGameMembers = await GameMember.find({
            gameId: gameId
        })


        if (!game || !allGameMembers) {
            resolve(null)
            return
        }

        let allScores = [],
            data,
            gameMember

        for (var player of allGameMembers) {
            if (player.userId.toString() == userId && game.players.includes(player.userId)) {
                gameMember = player
            }
            data = {
                userName: player.userName,
                score: player.score,
                roundScores: player.roundScores
            }
            allScores.push(data)
        }

        let allCards = {}
        for (var player of allGameMembers) {
            allCards[player.userId] = {
                userName: player.userName,
                count: player.currentCards.length,
                hasQuit: game.players.includes(player.userId) ? false : true,
                score: game.isRoundComplete === true ? calculateScore(player.currentCards) : null
            }
        }

        resolve({
            game: game,
            gameMember: gameMember,
            allScores: allScores,
            allGameMembers: allGameMembers,
            allCards: allCards,
            roundStatus: game.isRoundComplete === true ? RoundStatus(allGameMembers) : null
        })
    })
}

exports.isUserPartOfGame = (userId) => {

    return new Promise(async (resolve, reject) => {
        let game = await Game.findOne({
            $or: [{ players: userId }, { spectators: userId }],
            // players: userId,
            isStarted: true,
            isEnded: false
        })
        if (game) {
            resolve(game.gameId)
        } else {
            resolve(null)
        }
    })
}


exports.isGameEnded = (gameId) => {

    return new Promise(async (resolve, reject) => {
        let game = await Game.findOne({
            gameId: gameId
        })
        if (!game) {
            resolve(true)
        } else {
            resolve(game.isEnded)
        }
    })
}


exports.playersInGame = (gameId) => {

    return new Promise(async (resolve, reject) => {
        let game = await Game.findOne({
            gameId: gameId
        })
        var players = new Set([])
        if (game) {
            for (var userId of game.players) {
                players.add(userId.toString())
            }
            for (var userId of game.spectators) {
                players.add(userId.toString())
            }
        }
        resolve(players)
    })
}