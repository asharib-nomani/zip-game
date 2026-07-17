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

    svg.innerHTML = "";

    if (path.length < 2) return;

    for (let i = 0; i < path.length - 1; i++) {

        const first = path[i].getBoundingClientRect();
        const second = path[i + 1].getBoundingClientRect();
        const board = gameBoard.getBoundingClientRect();

        const x1 = first.left + first.width / 2 - board.left;
        const y1 = first.top + first.height / 2 - board.top;

        const x2 = second.left + second.width / 2 - board.left;
        const y2 = second.top + second.height / 2 - board.top;

        const line = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line"
        );

        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);

        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);

        line.setAttribute("stroke", "#0A66C2");
        line.setAttribute("stroke-width", "8");
        line.setAttribute("stroke-linecap", "round");

        svg.appendChild(line);
    }

}