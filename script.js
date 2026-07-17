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
    const index = Number(cell.dataset.index);

    const lastCell = selectedCells[selectedCells.length - 1];
    const lastIndex = Number(lastCell.dataset.index);

    if (!isAdjacent(lastIndex, index)) return;

    selectCell(cell);
    function isAdjacent(index1, index2) {

    const row1 = Math.floor(index1 / gridSize);
    const col1 = index1 % gridSize;

    const row2 = Math.floor(index2 / gridSize);
    const col2 = index2 % gridSize;

    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);

    return rowDiff + colDiff === 1;
}
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