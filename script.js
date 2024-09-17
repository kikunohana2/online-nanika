const socket = new WebSocket('ws://localhost:3000');
let playerSymbol = null;

document.getElementById('createRoom').addEventListener('click', () => {
  socket.send(JSON.stringify({ type: 'createRoom' }));
});

document.getElementById('joinRoom').addEventListener('click', () => {
  const roomID = document.getElementById('roomID').value;
  socket.send(JSON.stringify({ type: 'joinRoom', roomID }));
});

document.getElementById('exitGame').addEventListener('click', () => {
  socket.send(JSON.stringify({ type: 'exitGame' }));
  showLobby();
});

document.querySelectorAll('.cell').forEach(cell => {
  cell.addEventListener('click', () => {
    if (cell.textContent === '' && playerSymbol) {
      const index = cell.getAttribute('data-index');
      socket.send(JSON.stringify({ type: 'makeMove', index }));
    }
  });
});

socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'roomCreated':
      document.getElementById('roomID').value = data.roomID;
      break;

    case 'startGame':
      playerSymbol = data.symbol;
      showGame();
      break;

    case 'moveMade':
      document.querySelector(`.cell[data-index="${data.index}"]`).textContent = data.symbol;
      break;

    case 'gameEnd':
      document.getElementById('gameStatus').textContent = data.result === 'draw' ? '引き分けです！' : `${data.result} の勝ちです！`;
      break;

    case 'error':
      document.getElementById('errorMessage').textContent = data.message;
      break;
  }
});

function showLobby() {
  document.getElementById('lobby').style.display = 'block';
  document.getElementById('game').style.display = 'none';
}

function showGame() {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game').style.display = 'block';
}
