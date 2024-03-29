import Game from '../src/models/mongoDB/game';
import Users from '../src/models/mongoDB/users';
import GameMember from '../src/models/mongoDB/gameMember';
import { CardValues } from './calculateScore';

const getCardValue = (cardNum) => {
    cardNum = parseInt(cardNum)
    cardNum -= 1
    const cardValue = cardNum % 13
    const values = ["Aces", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Jacks", "Queens", "Kings"]
    return values[cardValue]
  }

var endGame = (gameId, declarePlayerUserName, wonTheGameUserName, isAutoPlay) => {
    return new Promise(async (resolve) => {
        await Game.updateOne(
            {
                gameId: gameId
            },
            {
                isEnded: true,
                previousDroppedPlayer: declarePlayerUserName,
                lastPlayedAction: `${wonTheGameUserName} has won the game`
            }
        )

        if (isAutoPlay == false) {
            await Users.updateOne(
                {
                    userName: wonTheGameUserName
                },
                {
                    $inc: {
                        totalWins: 1
                    }
                }
            )
        }

        resolve()
    })
}

var updateStats = (userId, score) => {
    return new Promise(async (resolve) => {
        let params = {
            totalDeclares: 1
        }
        if (score == -25) {
            params.totalPairs = 1
        } else if (score == 50) {
            params.totalFifties = 1
        }
        await Users.findByIdAndUpdate(
            userId,
            {
                $inc: params
            }
        )
        resolve()
    })
}

var declareRound = (gameId, userId, isAutoPlay) => {
    return new Promise(async (resolve, reject) => {
        let game = await Game.findOne({
            gameId: gameId
        })

        if (!game) {
            reject("Invalid game id")
            return
        }

        if (game.isRoundComplete === true) {
            reject("Round is complete")
            return
        }

        if (game.isEnded === true) {
            reject("Game has ended")
            return
        }

        if (game.currentPlayer.toString() != userId) {
            reject("Not current player")
            return
        }

        let gameMembers = await GameMember.find({
            gameId: gameId
        })

        let min = Number.MAX_VALUE,
            playerScore,
            total,
            isPair = false,
            allScores = {},
            beforeScores = {},
            lastPlayedAction,
            playerUserName


        // Calculate score of each player in the game
        for (var player of gameMembers) {
            beforeScores[player.userId.toString()] = player.score
            if (player.isEliminated == true) {
                allScores[player.userId.toString()] = -1
                continue
            }
            total = 0
            for (var card of player.currentCards) {

                total += CardValues(card)
            }
            if (player.userId.toString() == userId) {
                playerUserName = player.userName
                if (!game.canDeclareFirstRound && !player.hasPlayerDroppedCards) {
                    reject("Cannot declare first round")
                    return
                } else if (player.currentCards.length == 2 && (player.currentCards[0] - player.currentCards[1]) % 13 == 0) {
                    isPair = true
                    playerScore = game.endWithPair
                    lastPlayedAction = "Pair of " + getCardValue(player.currentCards[0])
                } else if (total < 15) {
                    playerScore = total
                    lastPlayedAction = `Declared with ${total} points`
                } else {
                    reject("Cannot declare with 15 or more points")
                    return
                }
            } else {
                min = Math.min(total, min)
            }
            allScores[player.userId.toString()] = total
        }

        // Check if person declared has the lowest sum and reassign scores accordingly
        if (isPair == false && playerScore < min) {
            allScores[userId] = 0
        } else if (isPair == false && playerScore > min) {
            allScores[userId] = game.wrongCall
        } else if (isPair == false && playerScore == min) {
            allScores[userId] *= 2
        } else {
            allScores[userId] = playerScore
        }

        // Update game status to ended
        await Game.updateOne(
            {
                gameId: gameId
            },
            {
                previousDroppedPlayer: playerUserName,
                lastPlayedAction: lastPlayedAction,
                isRoundComplete: true,
                // previousDroppedCards: [],
                lastPlayedTime: Date.now(),
                $inc: {
                    roundsComplete: 1
                }
            }
        )

        let numberOfActivePlayers = 0
        let activePlayerName = "No one"
        // Update scores of all members
        for (var player in beforeScores) {
            var previousScore = beforeScores[player]
            if (allScores[player] == -1) {
                await GameMember.updateOne(
                    {
                        gameId: gameId,
                        userId: player
                    },
                    {
                        $push: {
                            roundScores: allScores[player]
                        },
                        isEliminated: true
                    }
                )
            } else if (previousScore + allScores[player] > game.maxScore) {
                await GameMember.updateOne(
                    {
                        gameId: gameId,
                        userId: player
                    },
                    {
                        $inc: {
                            score: allScores[player]
                        },
                        $push: {
                            roundScores: allScores[player]
                        },
                        isEliminated: true
                    }
                )
            } else if (previousScore <= game.maxScore) {
                numberOfActivePlayers += 1
                var temp = await GameMember.findOneAndUpdate(
                    {
                        gameId: gameId,
                        userId: player
                    },
                    {
                        $inc: {
                            score: allScores[player]
                        },
                        $push: {
                            roundScores: allScores[player]
                        }
                    }
                )
                activePlayerName = temp.userName
            }

        }

        // End the game if lesser than 2 players are active
        let declarePlayerUser = await Users.findById(userId)
        if (numberOfActivePlayers < 2) {
            await endGame(gameId, declarePlayerUser.userName, activePlayerName, isAutoPlay)
        }
        if (isAutoPlay == false) {
            await updateStats(userId, allScores[userId])
        }

        resolve()
    })

}

export default declareRound;