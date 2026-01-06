# Sudoku Puzzle — Architecture & Interaction

This document describes how the Sudoku puzzle is created and how user interactions are evaluated as correct or incorrect. Refer to the implementation in [script-sudoku.js](script-sudoku.js) for the exact function bodies.

## Overview
- Puzzle generation uses a backtracking solver to create a complete solution, then removes numbers according to difficulty to produce a playable puzzle.
- User interactions (placing numbers, hints, erasing) are evaluated client-side by checking row, column, and 3x3 box constraints and by comparing against the stored solution when needed.

## Key functions (generation)
- `createEmptyBoard()` — returns an empty 9×9 board structure used as the starting point.
- `fillBoard(board)` — recursive backtracking solver used to fill an empty board with a valid complete solution. It tries numbers in randomized order and backtracks on conflicts.
- `generateFullSolution()` — wrapper that creates an empty board and calls `fillBoard` until a valid full solution is produced.
- `createPuzzleFromSolution(solution, difficulty)` — given a solved board, removes values according to the requested `difficulty` (easy/medium/hard) to create the starting puzzle. It ensures the resulting puzzle remains solvable (the generator's removal strategy aims to keep a unique or reasonable solution difficulty).

These functions together produce two important in-memory boards:
- `originalBoard` — the puzzle the player starts with (cells removed from the full solution). Cells marked as `given` are immutable in the UI.
- `solutionBoard` — the fully solved board produced by `generateFullSolution()`; used for hints and final-check operations.

## Key functions (rendering & UI)
- `renderBoard()` — creates the 9×9 DOM grid, applying CSS classes like `given`, `selected`, `correct`, `incorrect`, and `hint` based on board state.
- `selectCell(row, col)` / `onCellClick()` — UI handlers to mark which cell is active for input.

## Key functions (interaction & evaluation)
- `placeNumber(num)` — main handler invoked when a number button is pressed. It:
  - updates `sudokuBoard` (the current player board) at the selected cell, unless that cell is a `given`.
  - pushes the change onto `historyStack` to support `undo()`.
  - calls `validateCell(row, col)` to check whether the placed number conflicts with existing numbers in the same row, column, or 3×3 box.
  - if `Tutorial Mode` is enabled, uses `validateCell`'s detailed conflict information to show explanatory messages via `showTutorialMessage()` and highlights conflicting cells with `.conflict`.
  - if not in tutorial mode and the placement is wrong, increments `strikes` and may `lock` the game when the limit is reached.

- `validateCell(row, col)` — central validator for single-cell checks. It returns a structured result including:
  - `hasConflict` (boolean)
  - lists of conflicting coordinates for row, column, and box (`rowConflicts`, `colConflicts`, `boxConflicts`)
  - whether the value matches `solutionBoard[row][col]` (`isCorrect` / `correctValue`)

- `getHint()` — fills a single cell from `solutionBoard` (or gives a clue) and records a `hint` action in `historyStack`.
- `eraseIncorrect()` — scans the board and clears cells known to be incorrect (based on comparison with `solutionBoard`) and records the action for undo.
- `undo()` — pops the last action from `historyStack` and reverts the board state accordingly.
- `checkSolution()` — compares `sudokuBoard` with `solutionBoard` and reports completeness/correctness.

## Coordinate helpers
- `rowIndexToLetter(i)` and `colIndexToNumber(i)` / `coordLabel(row,col)` are small helpers used to format coordinates in tutorial messages (e.g., `A1`) so explanations reference understandable positions.

## Tutorial mode vs. normal mode
- When Tutorial Mode is enabled (`document.getElementById('tutorialToggle').checked`):
  - `placeNumber()` will not simply mark a placement wrong and count a strike. Instead it calls `validateCell()` to gather conflicts, highlights them, and shows a human-friendly explanation via `showTutorialMessage()`.
  - Explanations may include which row/column/box contains conflicting digits and candidate digits for the cell (computed from remaining possibilities), but they do not reveal the full solution unless the user requests a hint.

- When Tutorial Mode is disabled:
  - incorrect placements increment the `strikes` counter. Reaching `maxStrikes` may set `locked = true` and disable further input until `resetGame()`.

## UX / Visual feedback
- CSS classes applied by `renderBoard()` and validators:
  - `.given` — immutable starting digits.
  - `.selected` — currently active cell.
  - `.match` — cells that share the same digit as the selected cell.
  - `.conflict` — cells involved in a recent conflict highlighted by `validateCell()`.
  - `.hint` / `.correct` / `.incorrect` — used to visually indicate special states.

## Where to look in the code
- Generation and solver: see [script-sudoku.js](script-sudoku.js) functions `createEmptyBoard`, `fillBoard`, and `generateFullSolution`.
- Puzzle creation: `createPuzzleFromSolution(solution, difficulty)` in [script-sudoku.js](script-sudoku.js).
- Interaction and validation: `placeNumber`, `validateCell`, `getHint`, `eraseIncorrect`, `undo`, `checkSolution`, and `showTutorialMessage` in [script-sudoku.js](script-sudoku.js).

If you want, I can add line-anchored references to the exact function locations (e.g., [script-sudoku.js](script-sudoku.js#L123-L160)) after you confirm the file's current line numbers or allow me to scan the file and insert exact links.

---
Generated on 2026-01-06.
