let sudokuBoard = [];
let originalBoard = [];
let solutionBoard = [];
let selectedCell = null;
let hintsUsed = 0;
let historyStack = []; // store actions for undo
let strikes = 0;
let maxStrikes = 3;
let locked = false; // when true, player must reset to continue

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Helpers for coordinates: columns A-I, rows 1-9
// Row letter (0 -> 'A') and column number (1-9)
function rowIndexToLetter(i) {
    return String.fromCharCode(65 + i); // 0 -> 'A'
}
function colIndexToNumber(i) {
    return (i + 1).toString(); // 0 -> '1'
}
function coordLabel(row, col) {
    // Use RowLetter + ColumnNumber, e.g., A1
    return `${rowIndexToLetter(row)}${colIndexToNumber(col)}`;
}

function createEmptyBoard() {
    const b = [];
    for (let r = 0; r < 9; r++) b.push(new Array(9).fill(0));
    return b;
}

function isSafe(board, row, col, num) {
    for (let c = 0; c < 9; c++) if (board[row][c] === num) return false;
    for (let r = 0; r < 9; r++) if (board[r][col] === num) return false;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
            if (board[r][c] === num) return false;
        }
    }
    return true;
}

function fillBoard(board) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                const nums = [1,2,3,4,5,6,7,8,9];
                shuffle(nums);
                for (const n of nums) {
                    if (isSafe(board, row, col, n)) {
                        board[row][col] = n;
                        if (fillBoard(board)) return true;
                        board[row][col] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function generateFullSolution() {
    const board = createEmptyBoard();
    fillBoard(board);
    return board;
}

function createPuzzleFromSolution(sol, difficulty) {
    // difficulty: 'easy'|'medium'|'hard'
    const puzzle = sol.map(r => [...r]);
    let removals = 45; // medium default
    if (difficulty === 'easy') removals = 35;
    if (difficulty === 'hard') removals = 55;

    let removed = 0;
    while (removed < removals) {
        const r = Math.floor(Math.random() * 9);
        const c = Math.floor(Math.random() * 9);
        if (puzzle[r][c] !== 0) {
            puzzle[r][c] = 0;
            removed++;
        }
    }
    return puzzle;
}

// Initialize the game
function initGame(difficulty = 'medium') {
    hintsUsed = 0;
    selectedCell = null;
    historyStack = [];
    solutionBoard = generateFullSolution();
    const puzzle = createPuzzleFromSolution(solutionBoard, difficulty);
    originalBoard = puzzle.map(row => [...row]);
    sudokuBoard = puzzle.map(row => [...row]);
    renderBoard();
    updateStats();
    clearMessage();
}

// Render the board
function renderBoard() {
    const boardElement = document.querySelector('.sudoku-board');
    boardElement.innerHTML = '';

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = 'sudoku-cell';
            cell.id = `cell-${row}-${col}`;

            const value = sudokuBoard[row][col];

            if (originalBoard[row][col] !== 0) {
                cell.classList.add('given');
                cell.textContent = value || '';
            } else {
                cell.textContent = value || '';
            }
            // attach click handler for all cells to support matching-number highlights
            cell.addEventListener('click', () => onCellClick(row, col, cell));

            boardElement.appendChild(cell);
        }
    }
}

// Clear match highlights
function clearMatchHighlights() {
    const cells = document.querySelectorAll('.sudoku-cell.match');
    cells.forEach(c => c.classList.remove('match'));
}

// Clear conflict highlights
function clearConflicts() {
    const cells = document.querySelectorAll('.sudoku-cell.conflict');
    cells.forEach(c => c.classList.remove('conflict'));
}

// Show a persistent tutorial message in the tutorial panel
function showTutorialMessage(text, type = 'info') {
    const panel = document.getElementById('tutorialPanel');
    const content = document.getElementById('tutorialContent');
    if (!panel || !content) {
        // fallback to toast
        showMessage(text, type);
        return;
    }
    content.textContent = text;
    content.className = 'tutorial-content ' + (type || 'info');
}
// Highlight all cells with the same value
function highlightMatches(value) {
    clearMatchHighlights();
    if (!value) return;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (sudokuBoard[r][c] === value) {
                const el = document.getElementById(`cell-${r}-${c}`);
                if (el) el.classList.add('match');
            }
        }
    }
}

// Handle cell clicks: select and/or highlight matches
function onCellClick(row, col, cellElement) {
    // select the clicked cell (visual feedback)
    selectCell(row, col, cellElement);

    const value = sudokuBoard[row][col];
    if (value && value !== 0) {
        highlightMatches(value);
    } else {
        clearMatchHighlights();
    }
}

// Select a cell
function selectCell(row, col, cellElement) {
    if (selectedCell) {
        const prev = document.getElementById(`cell-${selectedCell.row}-${selectedCell.col}`);
        if (prev) prev.classList.remove('selected');
    }

    selectedCell = { row, col };
    cellElement.classList.add('selected');
}

// Place a number in selected cell
function placeNumber(num) {
    if (locked) {
        showMessage('Game locked after 3 strikes. Please reset to try again.', 'info');
        return;
    }
    if (!selectedCell) {
        showMessage('Select a cell first', 'info');
        return;
    }
    if (originalBoard[selectedCell.row][selectedCell.col] !== 0) {
        showMessage('Cannot modify given numbers!', 'error');
        return;
    }

    const prev = sudokuBoard[selectedCell.row][selectedCell.col];
    // record action for undo
    historyStack.push({ type: 'place', row: selectedCell.row, col: selectedCell.col, prev });
    sudokuBoard[selectedCell.row][selectedCell.col] = num;
    const cell = document.getElementById(`cell-${selectedCell.row}-${selectedCell.col}`);
    if (cell) cell.textContent = num;

    // Validate and show visual feedback
    const validation = validateCell(selectedCell.row, selectedCell.col);
    updateStats();
    // update match highlights for the newly placed number
    highlightMatches(num);
    // If tutorial mode is on and the placement is incorrect, explain why
    const tutorialToggle = document.getElementById('tutorialToggle');
    if (tutorialToggle && tutorialToggle.checked && validation && !validation.isCorrect) {
        // mark conflicting cells visually
        const mark = (arr) => arr.forEach(([r,c]) => {
            const el = document.getElementById(`cell-${r}-${c}`);
            if (el) el.classList.add('conflict');
        });
        if (validation.rowConflicts) mark(validation.rowConflicts);
        if (validation.colConflicts) mark(validation.colConflicts);
        if (validation.boxConflicts) mark(validation.boxConflicts);

        // build detailed explanation using column letters and row numbers
        const parts = [];
        if (validation.rowConflicts && validation.rowConflicts.length > 0) {
            const desc = validation.rowConflicts.map(rc => `${coordLabel(rc[0], rc[1])} (value ${sudokuBoard[rc[0]][rc[1]]})`).join(', ');
            parts.push(`row conflict with ${desc}`);
        }
        if (validation.colConflicts && validation.colConflicts.length > 0) {
            const desc = validation.colConflicts.map(rc => `${coordLabel(rc[0], rc[1])} (value ${sudokuBoard[rc[0]][rc[1]]})`).join(', ');
            parts.push(`column conflict with ${desc}`);
        }
        if (validation.boxConflicts && validation.boxConflicts.length > 0) {
            const desc = validation.boxConflicts.map(rc => `${coordLabel(rc[0], rc[1])} (value ${sudokuBoard[rc[0]][rc[1]]})`).join('; ');
            parts.push(`box conflict with ${desc}`);
        }

        let msg = '';
        const placedLabel = coordLabel(selectedCell.row, selectedCell.col);
        if (parts.length > 0) {
            msg = `Placed ${num} at ${placedLabel} — wrong: ` + parts.join('; ') + '.';
        } else {
            // No direct conflicts but still incorrect vs solution
            // Compute candidates (digits not present in row, column, or box)
            const present = new Set();
            for (let c = 0; c < 9; c++) if (sudokuBoard[selectedCell.row][c] !== 0) present.add(sudokuBoard[selectedCell.row][c]);
            for (let r = 0; r < 9; r++) if (sudokuBoard[r][selectedCell.col] !== 0) present.add(sudokuBoard[r][selectedCell.col]);
            const bRow = Math.floor(selectedCell.row / 3) * 3;
            const bCol = Math.floor(selectedCell.col / 3) * 3;
            for (let r = bRow; r < bRow + 3; r++) for (let c = bCol; c < bCol + 3; c++) if (sudokuBoard[r][c] !== 0) present.add(sudokuBoard[r][c]);

            const candidates = [];
            for (let d = 1; d <= 9; d++) if (!present.has(d)) candidates.push(d);

            msg = `Placed ${num} at ${placedLabel} — no direct row/column/box conflict, but valid candidates are: ${candidates.join(', ')}. The placed value ${num} is not among them.`;
        }

        // Show persistent tutorial message (panel) and also a toast fallback
        showTutorialMessage(msg, 'error');
        showMessage('Tutorial: check the panel for details.', 'info');
    }

    // If not in tutorial mode, count strikes for incorrect placements
    if (validation && !validation.isCorrect && (!tutorialToggle || !tutorialToggle.checked)) {
        strikes += 1;
        if (strikes < maxStrikes) {
            showMessage(`Strike ${strikes}/${maxStrikes}`, 'error');
        } else {
            // lock the game and prevent further placements until reset
            locked = true;
            // disable number buttons
            document.querySelectorAll('.num-btn').forEach(b => b.disabled = true);
            // visually highlight reset button(s)
            const resetBtn = document.querySelector('button[onclick="resetGame()"]');
            if (resetBtn) resetBtn.classList.add('highlight-reset');
            showMessage('3 strikes — game over. Please reset to try again.', 'error');
            showTutorialMessage('You have reached 3 strikes. Reset the puzzle to try a fresh game.', 'error');
        }
    }
}

// Clear the selected cell
function clearCell() {
    if (!selectedCell) return;
    if (originalBoard[selectedCell.row][selectedCell.col] !== 0) return;
    const prev = sudokuBoard[selectedCell.row][selectedCell.col];
    if (prev !== 0) {
        historyStack.push({ type: 'clear', row: selectedCell.row, col: selectedCell.col, prev });
    }
    sudokuBoard[selectedCell.row][selectedCell.col] = 0;
    const cell = document.getElementById(`cell-${selectedCell.row}-${selectedCell.col}`);
    if (cell) {
        cell.textContent = '';
        cell.classList.remove('correct', 'incorrect', 'hint');
    }
    updateStats();
    // clear any match highlights when a cell is cleared
    clearMatchHighlights();
    // clear any conflict highlights
    clearConflicts();
}

// Validate a cell (compare both conflicts and solution correctness)
function validateCell(row, col) {
    const value = sudokuBoard[row][col];
    const cell = document.getElementById(`cell-${row}-${col}`);
    if (!cell) return;
    // reset previous state
    cell.classList.remove('correct', 'incorrect');
    clearConflicts();
    if (value === 0) return { hasConflict: false };

    // collect precise conflicts
    const rowConflicts = [];
    const colConflicts = [];
    const boxConflicts = [];

    for (let c = 0; c < 9; c++) if (c !== col && sudokuBoard[row][c] === value) rowConflicts.push([row, c]);
    for (let r = 0; r < 9; r++) if (r !== row && sudokuBoard[r][col] === value) colConflicts.push([r, col]);
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
            if ((r !== row || c !== col) && sudokuBoard[r][c] === value) boxConflicts.push([r, c]);
        }
    }

    const hasConflict = rowConflicts.length > 0 || colConflicts.length > 0 || boxConflicts.length > 0;

    const correctValue = solutionBoard[row][col];
    const isCorrect = (!hasConflict && value === correctValue);
    if (isCorrect) cell.classList.add('correct');
    else cell.classList.add('incorrect');

    return { hasConflict, rowConflicts, colConflicts, boxConflicts, correctValue, isCorrect };
}

// Get a hint (reveal correct value from solution for a random empty cell)
function getHint() {
    const empties = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (originalBoard[r][c] === 0 && sudokuBoard[r][c] === 0) empties.push([r,c]);
    if (empties.length === 0) {
        showMessage('No empty cells available for hints!', 'info');
        return;
    }

    const [row, col] = empties[Math.floor(Math.random() * empties.length)];
    const hint = solutionBoard[row][col];
    // record hint action so it can be undone
    historyStack.push({ type: 'hint', row, col, prev: sudokuBoard[row][col] });
    sudokuBoard[row][col] = hint;
    const cell = document.getElementById(`cell-${row}-${col}`);
    if (cell) {
        cell.textContent = hint;
        cell.classList.add('hint');
    }
    hintsUsed++;
    updateStats();
    showMessage('Hint provided!', 'info');
}

// Check solution
function checkSolution() {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (sudokuBoard[r][c] !== solutionBoard[r][c]) {
        showMessage('❌ The puzzle has conflicts or is incomplete. Please check your entries!', 'error');
        return;
    }
    showMessage('🎉 Congratulations! You solved the puzzle!', 'success');
}

// Reset the game (revert to the generated puzzle)
function resetGame() {
    sudokuBoard = originalBoard.map(row => [...row]);
    hintsUsed = 0;
    selectedCell = null;
    historyStack = [];
    renderBoard();
    updateStats();
    clearMessage();
    // clear tutorial panel and conflicts on reset
    const content = document.getElementById('tutorialContent');
    if (content) content.textContent = 'Enable Tutorial Mode and place a number to see explanations.';
    clearConflicts();
    // reset strike state and re-enable inputs
    strikes = 0;
    locked = false;
    document.querySelectorAll('.num-btn').forEach(b => b.disabled = false);
    const resetBtn = document.querySelector('button[onclick="resetGame()"]');
    if (resetBtn) resetBtn.classList.remove('highlight-reset');
    // update strikes left display
    const strikesLeftEl = document.getElementById('strikesLeft');
    if (strikesLeftEl) strikesLeftEl.textContent = Math.max(0, maxStrikes - strikes);
}

// Show message
function showMessage(text, type) {
    const messageElement = document.getElementById('statusMessage');
    messageElement.textContent = text;
    messageElement.className = `status-message show ${type}`;
    setTimeout(() => {
        messageElement.classList.remove('show');
    }, 4000);
}

// Clear message
function clearMessage() {
    const messageElement = document.getElementById('statusMessage');
    messageElement.classList.remove('show');
}

// Update statistics
function updateStats() {
    let filled = 0;
    let correct = 0;
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (sudokuBoard[row][col] !== 0) {
                filled++;
                if (sudokuBoard[row][col] === solutionBoard[row][col]) correct++;
            }
        }
    }
    document.getElementById('filledCount').textContent = filled;
    document.getElementById('correctCount').textContent = correct;
    document.getElementById('hintsUsed').textContent = hintsUsed;
    const strikesLeftEl = document.getElementById('strikesLeft');
    if (strikesLeftEl) strikesLeftEl.textContent = Math.max(0, maxStrikes - strikes);
    // update usage counts for number buttons
    updateUsageCounts();
}

// Update remaining usage counts (9 total per digit) and show on buttons
function updateUsageCounts() {
    const counts = new Array(10).fill(0); // index 1..9
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const v = sudokuBoard[r][c];
            if (v >= 1 && v <= 9) counts[v]++;
        }
    }
    for (let d = 1; d <= 9; d++) {
        const remaining = Math.max(0, 9 - counts[d]);
        const el = document.getElementById(`count-${d}`);
        if (el) el.textContent = remaining;
        // disable the number button when no remaining uses
        const btn = el ? el.closest('button') : null;
        if (btn) btn.disabled = (remaining === 0) || locked;
    }
}

// Keyboard support
window.addEventListener('keydown', (e) => {
    if (!selectedCell) return;
    if (e.key >= '1' && e.key <= '9') placeNumber(Number(e.key));
    if (e.key === 'Backspace' || e.key.toLowerCase() === 'c') clearCell();
    if (e.key.toLowerCase() === 'u') undo();
});

// Hook up difficulty buttons and initialize
window.addEventListener('DOMContentLoaded', () => {
    const btnEasy = document.getElementById('btn-easy');
    const btnMedium = document.getElementById('btn-medium');
    const btnHard = document.getElementById('btn-hard');

    function setActiveDifficulty(level) {
        [btnEasy, btnMedium, btnHard].forEach(b => b.classList.remove('active'));
        if (level === 'easy') btnEasy.classList.add('active');
        if (level === 'medium') btnMedium.classList.add('active');
        if (level === 'hard') btnHard.classList.add('active');
    }

    btnEasy.addEventListener('click', () => { setActiveDifficulty('easy'); initGame('easy'); });
    btnMedium.addEventListener('click', () => { setActiveDifficulty('medium'); initGame('medium'); });
    btnHard.addEventListener('click', () => { setActiveDifficulty('hard'); initGame('hard'); });

    // initialize with medium active
    setActiveDifficulty('medium');
    initGame('medium');
    // ensure tutorial panel default text is set
    const content = document.getElementById('tutorialContent');
    if (content) content.textContent = 'Enable Tutorial Mode and place a number to see explanations.';

    // wire up strikes limit input
    const strikeInput = document.getElementById('strikeLimitInput');
    const strikesLeftEl = document.getElementById('strikesLeft');
    if (strikeInput) {
        maxStrikes = parseInt(strikeInput.value, 10) || maxStrikes;
        if (strikesLeftEl) strikesLeftEl.textContent = Math.max(0, maxStrikes - strikes);
        strikeInput.addEventListener('change', (e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v) && v >= 1) {
                maxStrikes = v;
                if (strikesLeftEl) strikesLeftEl.textContent = Math.max(0, maxStrikes - strikes);
                // if we were locked but now allowed by increased limit, unlock
                if (locked && strikes < maxStrikes) {
                    locked = false;
                    document.querySelectorAll('.num-btn').forEach(b => b.disabled = false);
                    const resetBtn = document.querySelector('button[onclick="resetGame()"]');
                    if (resetBtn) resetBtn.classList.remove('highlight-reset');
                    showMessage('Game unlocked (strike limit changed).', 'info');
                }
            }
        });
    }
    // Ensure tutorialToggle reference still works after move (no-op)
    const tutorialToggleCheck = document.getElementById('tutorialToggle');
    if (tutorialToggleCheck) {
        // nothing extra needed; keeping reference ensures element exists
    }
});

// Undo last action
function undo() {
    if (historyStack.length === 0) {
        showMessage('Nothing to undo', 'info');
        return;
    }

    const action = historyStack.pop();
    if (action.type === 'place' || action.type === 'clear' || action.type === 'hint') {
        const { row, col, prev } = action;
        sudokuBoard[row][col] = prev;
        const el = document.getElementById(`cell-${row}-${col}`);
        if (el) {
            el.textContent = prev === 0 ? '' : prev;
            el.classList.remove('correct', 'incorrect', 'hint', 'match');
            // re-validate cell if it has a value
            if (prev !== 0) validateCell(row, col);
        }
        if (action.type === 'hint') {
            // undoing a hint should reduce hintsUsed
            hintsUsed = Math.max(0, hintsUsed - 1);
        }
        updateStats();
        clearMatchHighlights();
        clearConflicts();
        // undo does not change strikes, but if we were locked, keep locked until reset
        return;
    }

    if (action.type === 'eraseWrong') {
        // restore multiple cleared cells
        for (const ch of action.changes) {
            sudokuBoard[ch.row][ch.col] = ch.prev;
            const el = document.getElementById(`cell-${ch.row}-${ch.col}`);
            if (el) {
                el.textContent = ch.prev === 0 ? '' : ch.prev;
                el.classList.remove('correct', 'incorrect', 'hint', 'match');
                if (ch.prev !== 0) validateCell(ch.row, ch.col);
            }
        }
        updateStats();
        clearMatchHighlights();
        clearConflicts();
        return;
    }
}

// Erase all incorrect user entries (records action for undo)
function eraseIncorrect() {
    const changes = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const el = document.getElementById(`cell-${r}-${c}`);
            if (!el) continue;
            // only remove non-given entries that are marked incorrect
            if (originalBoard[r][c] === 0 && el.classList.contains('incorrect')) {
                changes.push({ row: r, col: c, prev: sudokuBoard[r][c] });
                sudokuBoard[r][c] = 0;
                el.textContent = '';
                el.classList.remove('incorrect', 'correct', 'hint', 'match');
            }
        }
    }

    if (changes.length > 0) {
        historyStack.push({ type: 'eraseWrong', changes });
        updateStats();
        clearMatchHighlights();
        clearConflicts();
        showMessage(`Erased ${changes.length} incorrect entr${changes.length>1?'ies':'y'}.`, 'info');
    } else {
        showMessage('No incorrect entries to erase.', 'info');
    }
}
