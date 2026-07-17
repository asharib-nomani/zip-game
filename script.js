const gameBoard = document.getElementById("game-board");

const gridSize = 5;

const numberedCells = {
    0: 1,
    8: 2,
    16: 3,
    24: 4
};

let isDrawing = false;
let selectedCells = [];

function createBoard() {

    gameBoard.innerHTML = "";

    for (let i = 0; i < gridSize * gridSize; i++) {

        const cell = document.createElement("div");

        cell.classList.add("cell");

        cell.dataset.index = i;

        if (numberedCells[i]) {
            cell.textContent = numberedCells[i];
        }

        cell.addEventListener("mousedown", startDrawing);
        cell.addEventListener("mouseenter", draw);

        gameBoard.appendChild(cell);
    }
}

function startDrawing(event) {

    const cell = event.target;
    const index = Number(cell.dataset.index);

    if (numberedCells[index] !== 1) return;

    isDrawing = true;
    selectedCells = [];

    selectCell(cell);
}

function draw(event) {

    if (!isDrawing) return;

    const cell = event.target;

    selectCell(cell);
}

function selectCell(cell) {

    if (selectedCells.includes(cell)) return;

    selectedCells.push(cell);

    cell.style.backgroundColor = "#4CAF50";
}

document.addEventListener("mouseup", () => {
    isDrawing = false;
});

createBoard();