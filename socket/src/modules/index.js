import startGame from './startGame'
import game from '../models/mongoDB/game'
import Game from '../models/mongoDB/game'
import GameMember from '../models/mongoDB/gameMember'
import Users from '../models/mongoDB/users'

let allSpecators = {}
let allClients = {}
let clientIDS = {}
let userIDS = {}

var sendData = async (client, gameId, userId, gameData, membersData) => {

    // console.log("SENDING", Date.now())
    
    let data = await startGame.getGameStatus(gameId, userId, gameData, membersData)
    if (data) { 
        let currentCards = {
            cardOnTop: data.game.openedCards.pop(),
            previousDroppedCard: data.game.previousDroppedCards,
            previousDroppedPlayer: data.game.previousDroppedPlayer,
            action: data.game.lastPlayedAction
        }

        let allPlayers = {
            currentPlayer: data.game.currentPlayer,
            cardsCount: data.allCards,
            hostPlayer: data.game.createdUser,
            isRoundComplete: data.game.isRoundComplete,
            isRoundComplete: data.game.isRoundComplete,
            isEnded: data.game.isEnded,
            action: data.game.lastPlayedAction
        }

        let returnValue = {
            currentCards: currentCards,
            scores: data.allScores,
            allPlayers: allPlayers,
            roundStatus: data.roundStatus
        }
        client.emit('commonGameData', returnValue)

        if (data.gameMember) {
            
            let currentPlayerData = {
                currentPlayer: data.game.currentPlayer,
                playerCards: data.gameMember.currentCards,
                isRoundComplete: data.game.isRoundComplete,
                isGameComplete: data.game.isEnded,
                hostPlayer: data.game.createdUser,
                isWaiting: data.waitingPlayers
            }

            client.emit('currentPlayer', currentPlayerData)
        } else if (data.game.waiting.includes(userId)) {
            
            let currentPlayerData = {
                currentPlayer: null,
                playerCards: [],
                isRoundComplete: data.game.isRoundComplete,
                isGameComplete: data.game.isEnded,
                hostPlayer: data.game.createdUser,
                isWaiting: true
            }

            client.emit('currentPlayer', currentPlayerData)
        } else if (data.game.spectators.includes(userId)) {
            
            let currentPlayerData = {
                currentPlayer: null,
                playerCards: [],
                isRoundComplete: data.game.isRoundComplete,
                isGameComplete: data.game.isEnded,
                hostPlayer: data.game.createdUser,
                isWaiting: false
            }

            client.emit('currentPlayer', currentPlayerData)
        }

    } 
}

var sendWaitingScreenData = async (gameId) => {
    let users = await startGame.getPlayersInGame(gameId)
    let allUsers = users.players.concat(users.spectators)
    for (var player of allUsers) {
        if (player && allClients[player._id]) {
            allClients[player._id].emit('playersInGame', users)
        }
    }
}

var socketListener = (io) => {
    //Whenever someone connects this gets executed
    io.on('connection', function (client) {

        client.on('sendUserId', async (userId) => {
            console.log('sendUserId')
            if (userId) {
                allClients[userId] = client
                clientIDS[client.id] = userId
                console.log("User connected to server " + userId)
            }
        })
        
        client.on('spectateGame', async (userId, gameId) => {

            console.log('spectateGame')
            allSpecators[userId] = gameId
            await startGame.addSpectator(userId, gameId)
            console.log("Spectator connected to " + gameId)

        })

        try {
            client.on('getPlayers', async (gameId) => {
                console.log('getPlayers')
                await sendWaitingScreenData(gameId)
            })
        } catch (error) {
            
        }

        try {
            client.on('removePlayer', async (userId, gameId) => {
                console.log('removePlayer')
                let users = await startGame.getPlayersInGame(gameId)
                if (userId && allClients[userId]) {
                    allClients[userId].emit('playersInGame', users)
                }
                await sendWaitingScreenData(gameId)
            })
        } catch (error) {
            
        }
        
        try {
            client.on('getGameStatus', async (gameId, userId) => {

                // console.log('getGameStatus')
                allClients[userId] = client
                clientIDS[client.id] = userId

                let game = await Game.findOne({
                    gameId: gameId
                })
        
                let allGameMembers = await GameMember.find({
                    gameId: gameId
                })

                let waitingPlayers = []
                for (var waitingPlayer of game.waiting) {
                    let playerDetails = await Users.findById(waitingPlayer)
                    waitingPlayers.push(playerDetails.userName)
                }

                sendData(client, gameId, userId, game, allGameMembers, waitingPlayers) 
            })
        } catch (error) {

        }

        client.on('pushCommonData', async (gameId, userId) => {
            
            try {
                // console.log('pushCommonData')
                let gameData = await Game.findOne({
                    gameId: gameId
                })
                if (!gameData) {
                    return
                }
                
                var allPlayers = await startGame.playersInGame(gameData)
        
                let allGameMembers = await GameMember.find({
                    gameId: gameId
                })
    
                let waitingPlayers = []
                for (var waitingPlayer of gameData.waiting) {
                    let playerDetails = await Users.findById(waitingPlayer)
                    waitingPlayers.push(playerDetails.userName)
                }
                
                console.log("Sending data to players of game " + gameId)
                for (var userId of allPlayers) {
                    if (allClients[userId]) {
                        sendData(allClients[userId], gameId, userId, gameData, allGameMembers, waitingPlayers)
                    }
                }
            } catch (error) {

            }

        });

        //Whenever someone disconnects this piece of code executed
        client.on('disconnect', async () => {
            console.log('disconnect')
            let userId = clientIDS[client.id]
            delete allClients[userId]
            if (allSpecators[userId]) {
                await startGame.removeSpectator(userId, allSpecators[userId])
                delete allSpecators[userId]
                console.log("Spectator disconnected")
            } else {
                console.log('A user disconnected', client.id);
            }
        });
    });


    // var count = 0
    setInterval( async () => {

        var allGames = await startGame.activeGames()

        if (allGames.length === 0) {
            console.log("No active games")
        }        

        for (var gameData of allGames) {

            var gameId = gameData.gameId

            var allPlayers = await startGame.playersInGame(gameData)
            
            let allGameMembers = await GameMember.find({
                gameId: gameId
            })

            let waitingPlayers = []
            for (var waitingPlayer of gameData.waiting) {
                let playerDetails = await Users.findById(waitingPlayer)
                waitingPlayers.push(playerDetails.userName)
            }
            
            var count = 0;
            for (var userId of allPlayers) {
                if (allClients[userId]) {
                    count++;
                    sendData(allClients[userId], gameId, userId, gameData, allGameMembers, waitingPlayers)
                }
            }
            
            if (count == 0) {
                console.log("No users connected to game " + gameId)
            } else {
                console.log("Pushed data from server to " + count + " player(s) of game " + gameId)
            }

        }

        var notStartedGames = await startGame.notStartedGames()
        for (var game of notStartedGames) {
            var timeDiff = Date.now() - game.createdAt
            if (timeDiff > 2000000 || !game.createdAt) {
                console.log("Ending game " + game.gameId)
                await startGame.endGame(game.gameId)
            } else {
                console.log("Game not started " + game.gameId)
                await sendWaitingScreenData(game.gameId)
            }
        }

    }, 10 * 1000)

}

export default socketListener;