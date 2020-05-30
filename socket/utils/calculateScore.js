var cardValue = (number) => {
    var pos = number % 13
    if (pos === 0 || pos > 10) {
        return 10
    }
    return pos
}

var calculateScore = (allCards) => {
    if (allCards.length === 0) {
        return "-"
    }

    var total = 0
    for (var card of allCards) {
        total += cardValue(card)
    }
    return total
}

export default calculateScore;