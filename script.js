const gameBoard = document.getElementById("game-board");

const gridSize = 5;

// Number positions
const numberedCells = {
    0: 1,
    8: 2,
    16: 3,
    24: 4
};

let isDrawing = false;

for (let i = 0; i < gridSize * gridSize; i++) {

    const cell = document.createElement("div");

    cell.classList.add("cell");

    if (numberedCells[i]) {
        cell.textContent = numberedCells[i];
    }

    cell.addEventListener("mousedown", () => {
        isDrawing = true;
        cell.style.backgroundColor = "#4A90E2";
    });

    cell.addEventListener("mouseenter", () => {
        if (isDrawing) {
            cell.style.backgroundColor = "#4A90E2";
        }
    });

    gameBoard.appendChild(cell);
}

document.addEventListener("mouseup", () => {
    isDrawing = false;
});