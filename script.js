const gameBoard = document.getElementById("game-board");
const restartBtn = document.getElementById("restart-btn");

const gridSize = 5;

// Test puzzle
const numberedCells = {
    0: 1,
    1: 2,
    2: 3,
    3: 4
};

let isDrawing = false;
let selectedCells = [];
let nextNumber = 2;

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

    resetGame();

    isDrawing = true;
    nextNumber = 2;

    selectCell(cell);
}

function draw(event) {

    if (!isDrawing) return;

    const cell = event.target;
    const index = Number(cell.dataset.index);

    const lastCell = selectedCells[selectedCells.length - 1];
    const lastIndex = Number(lastCell.dataset.index);

    if (!isAdjacent(lastIndex, index)) return;

    if (selectedCells.includes(cell)) return;

    if (numberedCells[index]) {
        if (numberedCells[index] !== nextNumber) return;
        nextNumber++;
    }

    selectCell(cell);

    checkWin();
}

function selectCell(cell) {
    selectedCells.push(cell);
    cell.style.backgroundColor = "#4CAF50";
}

function isAdjacent(index1, index2) {

    const row1 = Math.floor(index1 / gridSize);
    const col1 = index1 % gridSize;

    const row2 = Math.floor(index2 / gridSize);
    const col2 = index2 % gridSize;

    return Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1;
}

function checkWin() {

    if (selectedCells.length === gridSize * gridSize) {

        isDrawing = false;

        setTimeout(() => {
            alert("🎉 You Win!");
        }, 100);
    }
}

function resetGame() {

    isDrawing = false;
    selectedCells = [];
    nextNumber = 2;

    const cells = document.querySelectorAll(".cell");

    cells.forEach(cell => {
        cell.style.backgroundColor = "white";
    });
}

document.addEventListener("mouseup", () => {
    isDrawing = false;
});

restartBtn.addEventListener("click", resetGame);

createBoard();