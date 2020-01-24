import { mod } from "./utils.js"

export default function createGame() {
    const state = {
        players: {},
        fruits: {},
        screen: {
            width: 25,
            height: 25,
            pixelsPerFields: 5,
        },
        config: {
            maxCollisionDistance: 4,
            shockCost: 5,
            initialScore: 150,
            autoDropFruitValue: 30,
        }
    }

    const observers = []

    function start() {
        const frequency = 2000

        //todo: change fruit colors based on quantity on same coord
        setInterval(addFruit, frequency)
    }

    function subscribe(observerFunction) {
        observers.push(observerFunction)
    }

    function notifyAll(command) {
        for (const observerFunction of observers) {
            observerFunction(command)
        }
    }

    function setState(newState) {
        Object.assign(state, newState)
    }

    function addPlayer(command) {
        const playerId = command.playerId
        const playerX = 'playerX' in command ? command.playerX : Math.floor(Math.random() * state.screen.width)
        const playerY = 'playerY' in command ? command.playerY : Math.floor(Math.random() * state.screen.height)

        state.players[playerId] = {
            x: playerX,
            y: playerY,
            score: state.config.initialScore
        }

        notifyAll({
            type: 'add-player',
            playerId: playerId,
            playerX: playerX,
            playerY: playerY,
            score: state.config.initialScore
        })
    }

    function removePlayer(command) {
        const playerId = command.playerId

        delete state.players[playerId]

        notifyAll({
            type: 'remove-player',
            playerId: playerId
        })
    }

    function addFruit(command) {

        const fruitX = command ? command.fruitX : Math.floor(Math.random() * state.screen.width)
        const fruitY = command ? command.fruitY : Math.floor(Math.random() * state.screen.height)
        const fruitId = command ? command.fruitId : `${fruitX}-${fruitY}`
        const quantity = command ? command.quantity : state.config.autoDropFruitValue

        const oldQuantity = state.fruits[fruitId] ? state.fruits[fruitId].quantity : 0

        /** update quantity */
        state.fruits[fruitId] = {
            x: fruitX,
            y: fruitY,
            quantity: quantity + oldQuantity
        }

        notifyAll({
            type: 'add-fruit',
            fruitId: `${fruitX}-${fruitY}`,
            fruitX,
            fruitY,
            quantity: quantity
        })
    }

    function removeFruit(command) {
        const fruitId = command.fruitId

        delete state.fruits[fruitId]

        notifyAll({
            type: 'remove-fruit',
            fruitId: fruitId,
        })
    }

    function movePlayer(command) {
        notifyAll(command)

        const acceptedMoves = {
            ArrowUp(player) {
                player.y = mod(state.screen.height, player.y - 1)
            },
            ArrowRight(player) {
                player.x = mod(state.screen.width, player.x + 1)
            },
            ArrowDown(player) {
                player.y = mod(state.screen.height, player.y + 1)
            },
            ArrowLeft(player) {
                player.x = mod(state.screen.width, player.x - 1)
            }
        }

        const keyPressed = command.keyPressed
        const playerId = command.playerId
        const player = state.players[playerId]
        const moveFunction = acceptedMoves[keyPressed]

        //stop player movement when die
        if (player && moveFunction && player.score > 0) {
            moveFunction(player)
            checkForFruitCollision(playerId)
            checkForPlayerCollision(playerId)
        }

    }

    /** check if user got points and generate collision 
     *  we can detect the direction of collision if save last position, to step back 
    */
    function checkForPlayerCollision(playerId) {
        const player = state.players[playerId]

        Object.keys(state.players).filter(k => k !== playerId).forEach(otherPlayerKey => {
            let otherPlayers = state.players[otherPlayerKey]
            if (player.x === otherPlayers.x && player.y === otherPlayers.y && otherPlayers.score > 0) {
                //remove 5 points and show extra 5 fruits for each player
                //console.log(`COLLISION between ${playerId} and ${otherPlayerKey}`)

                let otherPlayerDiscount = Math.min(otherPlayers.score, state.config.shockCost)
                let playerDiscount = Math.min(player.score, state.config.shockCost)
                let totalFruits = otherPlayerDiscount + playerDiscount

                state.players[otherPlayerKey].score -= otherPlayerDiscount
                state.players[playerId].score -= playerDiscount

                explodeFruits(totalFruits, player.x, player.y)
            }
        })
    }

    /** generate random number inclusive */
    function randomInteger(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * generate fruits based on collission and remaining user points
     */
    function explodeFruits(qtd, x, y) {
        let { screen, config } = state
        //calculate possible new coordinates
        let maxX = Math.min(x + config.maxCollisionDistance, screen.width)
        let minX = Math.max(x - config.maxCollisionDistance, 0)
        let maxY = Math.min(y + config.maxCollisionDistance, screen.height)
        let minY = Math.max(y - config.maxCollisionDistance, 0)

        let rest = qtd
        while (rest > 0) {
            let fruitQtd = randomInteger(1, rest)
            rest -= fruitQtd
            let fruitX = randomInteger(minX, maxX)
            let fruitY = randomInteger(minY, maxY)
            let fruitId = `${fruitX}-${fruitY}`
            addFruit({
                fruitId,
                fruitX,
                fruitY,
                quantity: fruitQtd
            })
        }
        //console.log(`state`,state)
    }

    function checkForFruitCollision(playerId) {
        const player = state.players[playerId]

        for (const fruitId in state.fruits) {
            const fruit = state.fruits[fruitId]
            // console.log(`Checking ${playerId} score ${player.score} and ${fruitId}`)

            if (player.x === fruit.x && player.y === fruit.y) {
                // console.log(`COLLISION between ${playerId} and ${fruitId}`)
                removeFruit({ fruitId: fruitId })
                player.score += fruit.quantity
            }
        }
    }

    return {
        addPlayer,
        removePlayer,
        movePlayer,
        addFruit,
        removeFruit,
        state,
        setState,
        subscribe,
        start
    }
}
