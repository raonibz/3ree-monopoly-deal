/* @flow */
/* eslint-env node, mocha */
import { expect } from 'chai'
import {
  RENT_BLUE_OR_GREEN,
  PROPERTY_BLUE_OR_GREEN,
  PROPERTY_PINK_OR_ORANGE,
  PROPERTY_PINK,
  PROPERTY_BLUE,
  PROPERTY_RED,
  BIRTHDAY,
  FORCED_DEAL,
  RENT_ALL_COLOUR,
  PROPERTY_WILDCARD,
  HOUSE,
  HOTEL
} from './cards'
import * as monopoly from './monopoly'
import PropertySet from './PropertySet'

describe('monopoly', function () {
  describe('#canPlayCard', function () {
    it('should return true for a rent card if the player has a rentable card', function () {
      const card = RENT_BLUE_OR_GREEN
      const placedCards: PlacedCards = {
        bank: [],
        serializedPropertySets: [{
          identifier: monopoly.getCardObject(PROPERTY_BLUE),
          cards: [PROPERTY_BLUE]
        }]
      }
      expect(monopoly.canPlayCard(card, placedCards)).to.be.true
    })

    it('should return false for a rent card if the player has no rentable card', function () {
      const card = RENT_BLUE_OR_GREEN
      const placedCards: PlacedCards = {
        bank: [],
        serializedPropertySets: [{
          identifier: monopoly.getCardObject(PROPERTY_PINK),
          cards: [PROPERTY_PINK]
        }]
      }
      expect(monopoly.canPlayCard(card, placedCards)).to.be.false
    })

    it('should return true if the card is an action card', function () {
      const actionCard = BIRTHDAY
      const placedCards = {
        bank: [],
        serializedPropertySets: []
      }
      expect(monopoly.canPlayCard(actionCard, placedCards)).to.be.true
    })

    describe('Given the card is a FORCED_DEAL', function () {
      it('should not return false if the player has no properties to trade with', function () {
        const card = FORCED_DEAL
        const placedCards: PlacedCards = {
          bank: [],
          serializedPropertySets: []
        }
        expect(monopoly.canPlayCard(card, placedCards)).to.be.false
      })

      it('should return true if the player has properties to trade with', function () {
        const card = FORCED_DEAL
        const placedCards: PlacedCards = {
          bank: [],
          serializedPropertySets: [{
            identifier: monopoly.getCardObject(PROPERTY_RED),
            cards: [PROPERTY_RED]
          }]
        }
        expect(monopoly.canPlayCard(card, placedCards)).to.be.true
      })
    })

    describe('Given the card is a wildcard rent', function () {
      it('should return false if the player has no properties to rent', function () {
        const card = RENT_ALL_COLOUR
        const placedCards: PlacedCards = {
          bank: [],
          serializedPropertySets: []
        }
        expect(monopoly.canPlayCard(card, placedCards)).to.be.false
      })

      it('should return true if the player has properties to rent', function () {
        const card = RENT_ALL_COLOUR
        const placedCards: PlacedCards = {
          bank: [],
          serializedPropertySets: [{
            identifier: monopoly.getCardObject(PROPERTY_RED),
            cards: [PROPERTY_RED]
          }]
        }
        expect(monopoly.canPlayCard(card, placedCards)).to.be.true
      })
    })

    describe('Given the card is a rent card', function () {
      describe('Given player has wildcard properties', function () {
        it('should return true if one or more of the wildcard properties are rentable', function () {
          const card = RENT_BLUE_OR_GREEN
          const placedCards: PlacedCards = {
            bank: [],
            serializedPropertySets: [{
              identifier: monopoly.getCardObject(PROPERTY_BLUE),
              cards: [PROPERTY_BLUE_OR_GREEN]
            }]
          }
          expect(monopoly.canPlayCard(card, placedCards)).to.be.true
        })

        it('should return false if none of the wildcard properties are rentable', function () {
          const card = RENT_BLUE_OR_GREEN
          const placedCards: PlacedCards = {
            bank: [],
            serializedPropertySets: [{
              identifier: monopoly.getCardObject(PROPERTY_PINK),
              cards: [PROPERTY_PINK_OR_ORANGE]
            }]
          }
          expect(monopoly.canPlayCard(card, placedCards)).to.be.false
        })
      })
    })
  })

  describe('#mergeSerializedPropertySets', function () {
    describe('Given I have one full set A and a non full set B', function () {
      describe('Given the other player has a set B2 that can be merged into B, ' +
        'a full set C2 that cannot be merged and a set of the same colour as A', function () {
        it('should merge other property sets into mine with no left over non property cards', function () {
          const mine = [
            new PropertySet(monopoly.getCardObject(PROPERTY_BLUE), [PROPERTY_BLUE, PROPERTY_BLUE]).serialize(),
            new PropertySet(monopoly.getCardObject(PROPERTY_RED), [PROPERTY_RED, PROPERTY_WILDCARD]).serialize()
          ]

          const theirs = [
            new PropertySet(monopoly.getCardObject(PROPERTY_BLUE), [PROPERTY_BLUE]).serialize(),
            new PropertySet(monopoly.getCardObject(PROPERTY_RED), [PROPERTY_RED]).serialize(),
            new PropertySet(monopoly.getCardObject(PROPERTY_PINK), [
              PROPERTY_PINK,
              PROPERTY_PINK,
              PROPERTY_PINK,
              HOUSE,
              HOTEL
            ]).serialize()
          ]

          const leftOverNonPropertyCards = monopoly.mergeSerializedPropertySets(mine, theirs)

          expect(leftOverNonPropertyCards).to.be.instanceof(Array)
          expect(leftOverNonPropertyCards).to.be.empty

          expect(mine).to.have.lengthOf(4)

          // Full set A
          expect(mine.shift()).to.eql({
            identifier: monopoly.getCardObject(PROPERTY_BLUE),
            cards: [PROPERTY_BLUE, PROPERTY_BLUE]
          })

          // Set B now becomes a full set
          expect(mine.shift()).to.eql({
            identifier: monopoly.getCardObject(PROPERTY_RED),
            cards: [PROPERTY_RED, PROPERTY_WILDCARD, PROPERTY_RED]
          })

          // A new set since set A is full
          expect(mine.shift()).to.eql({
            identifier: monopoly.getCardObject(PROPERTY_BLUE),
            cards: [PROPERTY_BLUE]
          })

          // Completely new set C
          expect(mine.shift()).to.eql({
            identifier: monopoly.getCardObject(PROPERTY_PINK),
            cards: [
              PROPERTY_PINK,
              PROPERTY_PINK,
              PROPERTY_PINK,
              HOUSE,
              HOTEL
            ]
          })
        })
      })
    })

    describe('Given I have a non full set A', function () {
      describe('Given the other player has a full set A2 with house and hotel of the same colour as A', function () {
        it('should merge into 2 different property sets', function () {
          const setIdentifier = monopoly.getCardObject(PROPERTY_BLUE)
          const mine = [
            new PropertySet(setIdentifier, [PROPERTY_BLUE])
          ]

          const theirs = [
            new PropertySet(setIdentifier, [PROPERTY_BLUE, PROPERTY_BLUE, HOUSE, HOTEL])
          ]

          const leftOverNonPropertyCards = monopoly.mergeSerializedPropertySets(mine, theirs)

          expect(leftOverNonPropertyCards).to.be.instanceof(Array)
          expect(leftOverNonPropertyCards).to.be.empty
          expect(mine).to.have.lengthOf(2)

          expect(mine.shift()).to.eql({
            identifier: setIdentifier,
            cards: [PROPERTY_BLUE]
          })

          expect(mine.shift()).to.eql({
            identifier: setIdentifier,
            cards: [PROPERTY_BLUE, PROPERTY_BLUE, HOUSE, HOTEL]
          })
        })
      })
    })
  })
})
