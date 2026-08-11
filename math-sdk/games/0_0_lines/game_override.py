from game_executables import GameExecutables
from src.calculations.statistics import get_random_outcome
from src.events.events import fs_multiplier_event


class GameStateOverride(GameExecutables):
    """
    This class is is used to override or extend universal state.py functions.
    e.g: A specific game may have custom book properties to reset
    """

    def reset_book(self):
        super().reset_book()

    def update_freespin_amount(self, scatter_key: str = "scatter") -> None:
        super().update_freespin_amount(scatter_key)
        fs_multiplier_event(self)

    def update_freespin(self) -> None:
        super().update_freespin()
        # Tumble-ladder multiplier resets at the start of every free spin.
        self.global_multiplier = 1

    def assign_special_sym_function(self):
        self.special_symbol_functions = {
            "W": [self.assign_mult_property],
        }

    def assign_mult_property(self, symbol) -> dict:
        """Assign multiplier value to Wild symbols from the current gametype's distribution."""
        multiplier_value = get_random_outcome(
            self.get_current_distribution_conditions()["mult_values"][self.gametype]
        )
        symbol.assign_attribute({"multiplier": multiplier_value})

    def check_repeat(self):
        super().check_repeat()
        if self.repeat is False:
            win_criteria = self.get_current_betmode_distributions().get_win_criteria()
            if win_criteria is not None and self.final_win != win_criteria:
                self.repeat = True
                return
            if win_criteria is None and self.final_win == 0:
                self.repeat = True
                return
