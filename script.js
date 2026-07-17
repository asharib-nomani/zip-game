const gameBoard = document.getElementById("game-board");
const svg = document.getElementById("path-svg");
const restartBtn = document.getElementById("restart-btn");

const GRID_SIZE = 5;
const CELL_SIZE = 60;
const GAP = 7.5;

// Test puzzle (later we'll load real puzzles)
const puzzle = {
    0: 1,
    1: 2,
    2: 3,
    3: 4
};

let cells = [];
let path = [];
let isDrawing = false;

createBoard();

restartBtn.addEventListener("click", restartGame);

document.addEventListener("mouseup", () => {
    isDrawing = false;
});

function createBoard() {

    gameBoard.innerHTML = "";
    svg.innerHTML = "";
    cells = [];

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {

        const cell = document.createElement("div");

        cell.className = "cell";
        cell.dataset.index = i;

        if (puzzle[i]) {
            cell.textContent = puzzle[i];

            if (puzzle[i] === 1) {
                cell.classList.add("start");
            }
        }

        cell.addEventListener("mousedown", startPath);
        cell.addEventListener("mouseenter", continuePath);

        gameBoard.appendChild(cell);

        cells.push(cell);
    }
}

function startPath(e) {

    const cell = e.target;
    const index = Number(cell.dataset.index);

    if (puzzle[index] !== 1) return;

    restartGame();

    isDrawing = true;

    addCellToPath(cell);
}

function continuePath(e) {

    if (!isDrawing) return;

    const cell = e.target;

    if (path.includes(cell)) return;

    addCellToPath(cell);
}

function addCellToPath(cell) {

    path.push(cell);

    cell.style.background = "#CFE8FF";

    redrawPath();
}

function restartGame() {

    path = [];
    isDrawing = false;

    svg.innerHTML = "";

    cells.forEach(cell => {
        cell.style.background = "white";
    });
}

function redrawPath() {

    // Next part :)
}