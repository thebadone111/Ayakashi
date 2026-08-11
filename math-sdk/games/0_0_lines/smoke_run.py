"""Tiny smoke run: validates game logic changes (tumble ladder, base Wild mults)
without touching optimization. Run before the full run.py."""

from gamestate import GameState
from game_config import GameConfig
from src.state.run_sims import create_books

if __name__ == "__main__":
    config = GameConfig()
    gamestate = GameState(config)
    create_books(
        gamestate,
        config,
        {"base": 2000, "bonus": 500},
        1000,
        4,
        False,
        False,
    )
    print("SMOKE RUN OK")
