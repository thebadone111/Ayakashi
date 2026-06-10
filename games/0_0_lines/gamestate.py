from game_override import GameStateOverride


class GameState(GameStateOverride):
    """Handles game logic and events for a single simulation number/game-round."""

    def run_spin(self, sim, simulation_seed=None):
        self.reset_seed(sim)
        self.repeat = True
        while self.repeat:
            self.reset_book()
            self.draw_board()

            self.evaluate_lines_board()
            self.emit_tumble_win_events()
            while self.win_data["totalWin"] > 0 and not self.wincap_triggered:
                self.tumble_game_board()
                self.evaluate_lines_board()
                self.emit_tumble_win_events()
            self.set_end_tumble_event()

            self.win_manager.update_gametype_wins(self.gametype)
            if self.check_fs_condition() and self.check_freespin_entry():
                self.run_freespin_from_base()

            self.evaluate_finalwin()
            self.check_repeat()
        self.imprint_wins()

    def run_freespin(self):
        self.reset_fs_spin()
        while self.fs < self.tot_fs:
            self.update_freespin()
            self.draw_board()

            self.evaluate_lines_board()
            self.emit_tumble_win_events()
            while self.win_data["totalWin"] > 0 and not self.wincap_triggered:
                self.tumble_game_board()
                self.evaluate_lines_board()
                self.emit_tumble_win_events()
            self.set_end_tumble_event()

            if self.check_fs_condition():
                self.update_fs_retrigger_amt()

            self.win_manager.update_gametype_wins(self.gametype)

        self.end_freespin()
