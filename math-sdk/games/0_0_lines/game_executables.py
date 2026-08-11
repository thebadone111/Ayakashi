from game_calculations import GameCalculations
from src.calculations.lines import Lines


class GameExecutables(GameCalculations):

    def evaluate_lines_board(self):
        """Populate win-data, record wins, and mark symbols for explosion."""
        # "combined": Wild symbol multipliers (added) scaled by the tumble-ladder
        # global multiplier. With global_multiplier == 1 this is identical to the
        # previous "symbol" strategy.
        self.win_data = Lines.get_lines(
            self.board,
            self.config,
            multiplier_method="combined",
            global_multiplier=self.global_multiplier,
        )
        Lines.record_lines_wins(self)
        self.win_manager.update_spinwin(self.win_data["totalWin"])
        self._mark_winning_positions_explodable()
        self._mark_exploder_area()

    def _mark_winning_positions_explodable(self):
        """Mark every symbol on a winning payline for removal during tumble."""
        for win in self.win_data["wins"]:
            for pos in win["positions"]:
                self.board[pos["reel"]][pos["row"]].explode = True

    def _mark_exploder_area(self):
        """When a win occurs, any X symbol destroys a 3x3 area centred on itself."""
        if self.win_data["totalWin"] == 0:
            return
        for pos in self.special_syms_on_board.get("exploder", []):
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    r = pos["reel"] + dr
                    c = pos["row"] + dc
                    if 0 <= r < self.config.num_reels and 0 <= c < self.config.num_rows[r]:
                        self.board[r][c].explode = True
