const gameBoard = document.getElementById("game-board");

const gridSize = 5;

// Number positions
const numberedCells = {
    0: 1,
    8: 2,
    16: 3,
    24: 4
};

for (let i = 0; i < gridSize * gridSize; i++) {

    const cell = document.createElement("div");

    cell.classList.add("cell");

    if (numberedCells[i]) {
        cell.textContent = numberedCells[i];
    }

    gameBoard.appendChild(cell);

}