/* @flow */
import { namespace, deepmerge, apiUrl, getGameIdAndCurrentPlayerUsername } from '../../../../ducks-utils'
import request from 'axios'
import * as monopoly from '../../../../monopoly/monopoly'
import { getCurrentPlayer } from '../gameSelectors'

function ns (value) {
  return namespace('CARDS_ON_HAND', value)
}

// ------------------------------------
// Constants
// ------------------------------------
const gamesUrl = `${apiUrl}/games`

const DRAW_CARDS_REQUEST = ns('DRAW_CARDS_REQUEST')
const DRAW_CARDS_SUCCESS = ns('DRAW_CARDS_SUCCESS')
const DISCARD_CARD_REQUEST = ns('DISCARD_CARD_REQUEST')
export const DISCARD_CARD_SUCCESS = ns('DISCARD_CARD_SUCCESS')
const PLACE_CARD_REQUEST = ns('PLACE_CARD_REQUEST')
const PLACE_CARD_SUCCESS = ns('PLACE_CARD_SUCCESS')
const PLAY_CARD_REQUEST = ns('PLAY_CARD_REQUEST')
const PLAY_CARD_SUCCESS = ns('PLAY_CARD_SUCCESS')
const FLIP_CARD_ON_HAND = ns('FLIP_CARD_ON_HAND')
const RESET = ns('RESET')
const ERROR = ns('ERROR')

// ------------------------------------
// Actions
// ------------------------------------
function drawCards () {
  return {
    types: [DRAW_CARDS_REQUEST, DRAW_CARDS_SUCCESS, ERROR],
    promise: (dispatch: Function, getState: Function) => {
      const [id, username] = getGameIdAndCurrentPlayerUsername(getState())
      const cardsOnHand = getState().currentPlayerCardsOnHand.cardsOnHand
      return request.get(`${gamesUrl}/${id}/draw`, {
        params: {
          emptyHand: !cardsOnHand.length,
          username
        }
      })
    }
  }
}

function setCardsOnHand (cards: CardKey[]) {
  return {
    type: DRAW_CARDS_SUCCESS,
    payload: { cards }
  }
}

function discardCard (card: CardKey) {
  return {
    types: [DISCARD_CARD_REQUEST, DISCARD_CARD_SUCCESS, ERROR],
    card,
    promise: (dispatch: Function, getState: Function) => {
      const [id, username] = getGameIdAndCurrentPlayerUsername(getState())
      return request.put(`${gamesUrl}/${id}/discard`, { username, card })
    }
  }
}

function placeCard (card: CardKey, asMoney: boolean = false, setToPutIn?: SerializedPropertySet) {
  return {
    types: [PLACE_CARD_REQUEST, PLACE_CARD_SUCCESS, ERROR],
    card,
    promise: (dispatch: Function, getState: Function) => {
      const [id, username] = getGameIdAndCurrentPlayerUsername(getState())
      return request.put(`${gamesUrl}/${id}/place`, { card, username, asMoney, setToPutIn })
    }
  }
}

function playCard (card: CardKey) {
  return (dispatch: Function, getState: Function) => {
    dispatch({ type: PLAY_CARD_REQUEST })

    const currentGame = getState().currentGame
    const currentPlayer = getCurrentPlayer(getState())

    if (!currentPlayer) {
      throw new Error('Cannot find current player')
    }

    return request
      .put(`${gamesUrl}/${currentGame.game.id}/play`, { card, username: currentPlayer.username })
      .then(handleSuccessRequest)
      .catch(handleErrorRequest)

    //////
    function handleSuccessRequest (res) {
      if (!currentPlayer) {
        throw new Error('Cannot find current player')
      }

      dispatch({ type: PLAY_CARD_SUCCESS, payload: res.data, card })
    }

    function handleErrorRequest (error) {
      dispatch({ type: ERROR, error })
    }
  }
}

function targetPayment (targetPlayer: Player, card: CardKey) {
  return (dispatch: Function, getState: Function) => {
    const currentGame = getState().currentGame
    const payee = getCurrentPlayer(getState())

    if (!payee) {
      throw new Error('Payee does not exist')
    }

    return request
      .put(`${gamesUrl}/${currentGame.game.id}/target-payment`, {
        payee: payee.username,
        targetUser: targetPlayer.username,
        card
      })
      .then(handleSuccessRequest)
      .catch(handleErrorRequest)

    //////
    function handleSuccessRequest (res) {
      const payee = getCurrentPlayer(getState())

      if (!payee) {
        return
      }

      dispatch({ type: DISCARD_CARD_SUCCESS, card })
    }

    function handleErrorRequest (error) {
      dispatch({ type: ERROR, error })
    }
  }
}

function flipCardOnHand (card: CardKey) {
  return {
    type: FLIP_CARD_ON_HAND,
    card,
    flippedCard: monopoly.flipCard(card)
  }
}

function reset () {
  return { type: RESET }
}

export const actions = {
  reset,
  drawCards,
  setCardsOnHand,
  playCard,
  placeCard,
  discardCard,
  flipCardOnHand,
  targetPayment
}

// ------------------------------------
// Reducer
// ------------------------------------
export type CurrentPlayerCardsOnHandState = {
  cardsOnHand: CardKey[],
  isWorking: boolean,
  error: mixed
}

const initialState: CurrentPlayerCardsOnHandState = {
  cardsOnHand: [],
  isWorking: false,
  error: null
}

export default function reducer (state: CurrentPlayerCardsOnHandState = initialState, action: ReduxAction) {
  switch (action.type) {
    case DRAW_CARDS_REQUEST:
    case DISCARD_CARD_REQUEST:
    case PLACE_CARD_REQUEST:
    case PLAY_CARD_REQUEST:
      return deepmerge(state, { isWorking: true, error: null })

    case DRAW_CARDS_SUCCESS: {
      return {
        ...state,
        cardsOnHand: state.cardsOnHand.concat(action.payload.cards)
      }
    }

    case FLIP_CARD_ON_HAND: {
      const nextState = deepmerge(state)
      const indexToFlip = nextState.cardsOnHand.indexOf(action.card)
      nextState.cardsOnHand[indexToFlip] = action.flippedCard
      return nextState
    }

    case DISCARD_CARD_SUCCESS:
    case PLACE_CARD_SUCCESS:
    case PLAY_CARD_SUCCESS: {
      const indexToRemove = state.cardsOnHand.indexOf(action.card)
      const goCardResult = (action.payload && action.payload.goCardResult) || []

      return {
        ...state,
        cardsOnHand: [
          ...state.cardsOnHand.slice(0, indexToRemove),
          ...state.cardsOnHand.slice(indexToRemove + 1),
          ...goCardResult
        ]
      }
    }

    case RESET:
      return { ...initialState }

    default:
      return state
  }
}
