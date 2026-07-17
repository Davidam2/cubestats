import random

# Basic move sets for 2x2 and 3x3
MOVES_3x3 = ["R", "L", "U", "D", "F", "B"]
MODIFIERS = ["", "'", "2"]
MOVES_2x2 = ["R", "U", "F"]

def generate_scramble(event="3x3", length=None):
    """
    Generate a scramble string for a given cube event.
    Default is 3x3 (20 moves). For 2x2, use 11 moves.
    """
    if event == "2x2":
        moves = MOVES_2x2
        scramble_len = length or 11
    else:
        moves = MOVES_3x3
        scramble_len = length or 20

    scramble = []
    prev_move = ""
    for _ in range(scramble_len):
        move = random.choice(moves)
        # Prevent same face twice in a row
        while move == prev_move:
            move = random.choice(moves)
        modifier = random.choice(MODIFIERS)
        scramble.append(move + modifier)
        prev_move = move
    return " ".join(scramble)

# Example usage
if __name__ == "__main__":
    print("3x3 scramble:", generate_scramble("3x3"))
    print("2x2 scramble:", generate_scramble("2x2"))
