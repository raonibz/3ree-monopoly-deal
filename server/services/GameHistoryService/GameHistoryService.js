/* @flow */
import GameHistoryRepository from '../../repositories/GameHistoryRepository'

export default class GameHistoryService {
  gameHistoryRepository: GameHistoryRepository

  constructor () {
    this.gameHistoryRepository = new GameHistoryRepository()
  }

  static liveUpdates (io) {
    GameHistoryRepository.watchForChanges((change) => {
      const newRecord = change.new_val

      if (!newRecord) {
        return
      }

      io.emit(`game-${newRecord.gameId}-history`, newRecord)
    })
  }

  record (gameId: string, message: string, playersToNotify?: Username[]): Promise<GameHistoryRecord> {
    return this.gameHistoryRepository.insert({ gameId, message, playersToNotify })
  }

  getRecentHistoryLogs (gameId: string): Promise<GameHistoryRecord[]> {
    return this.gameHistoryRepository.getAll(gameId, 0, 20)
  }
}
