export class GameManager {
  constructor() {
    this.games = new Map();
  }

  createGame(id, game) {
    this.games.set(id, game);
  }

  getGame(id) {
    return this.games.get(id);
  }

  endGame(id) {
    this.games.delete(id);
  }
}
