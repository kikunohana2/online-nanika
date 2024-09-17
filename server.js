const http = require('http');
const WebSocket = require('ws');
const express = require('express');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let rooms = {};  // ルームの管理

// クライアント接続時の処理
wss.on('connection', (ws) => {
  let roomID = null;
  let playerSymbol = null;

  // クライアントからのメッセージを受信
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'createRoom':
        roomID = generateRoomID();
        rooms[roomID] = { players: [ws], gameState: Array(9).fill(null) };
        playerSymbol = 'O';  // ルームを作ったプレイヤーは "O"
        ws.send(JSON.stringify({ type: 'roomCreated', roomID }));
        break;
      
      case 'joinRoom':
        roomID = data.roomID;
        if (rooms[roomID] && rooms[roomID].players.length < 2) {
          playerSymbol = 'X';  // 2人目のプレイヤーは "X"
          rooms[roomID].players.push(ws);
          startGame(roomID);  // ゲーム開始
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Room is full or does not exist' }));
        }
        break;

      case 'makeMove':
        if (rooms[roomID]) {
          const { gameState } = rooms[roomID];
          if (gameState[data.index] === null) {
            gameState[data.index] = playerSymbol;
            broadcastMove(roomID, data.index, playerSymbol);
            checkGameEnd(roomID);
          }
        }
        break;

      case 'exitGame':
        exitRoom(roomID, ws);
        break;
    }
  });

  // クライアントが切断されたときの処理
  ws.on('close', () => {
    exitRoom(roomID, ws);
  });
});

// ルームIDの生成
function generateRoomID() {
  return Math.random().toString(36).substring(2, 9);
}

// ゲーム開始時にプレイヤーに通知
function startGame(roomID) {
  rooms[roomID].players.forEach((player, index) => {
    const symbol = index === 0 ? 'O' : 'X';
    player.send(JSON.stringify({ type: 'startGame', symbol }));
  });
}

// ゲームの状態をすべてのプレイヤーに送信
function broadcastMove(roomID, index, symbol) {
  rooms[roomID].players.forEach(player => {
    player.send(JSON.stringify({ type: 'moveMade', index, symbol }));
  });
}

// ゲームが終了したかどうかをチェック
function checkGameEnd(roomID) {
  const { gameState } = rooms[roomID];
  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  // 勝敗判定
  for (const [a, b, c] of winningCombinations) {
    if (gameState[a] && gameState[a] === gameState[b] && gameState[a] === gameState[c]) {
      broadcastGameEnd(roomID, gameState[a]);
      return;
    }
  }

  // 引き分け判定
  if (gameState.every(cell => cell !== null)) {
    broadcastGameEnd(roomID, 'draw');
  }
}

// 勝敗の通知
function broadcastGameEnd(roomID, result) {
  rooms[roomID].players.forEach(player => {
    player.send(JSON.stringify({ type: 'gameEnd', result }));
  });
}

// ルームからの退出処理
function exitRoom(roomID, ws) {
  if (roomID && rooms[roomID]) {
    rooms[roomID].players = rooms[roomID].players.filter(player => player !== ws);
    if (rooms[roomID].players.length === 0) {
      delete rooms[roomID];  // ルームを削除
    }
  }
}

// 静的ファイルを提供
app.use(express.static('public'));

// サーバーのポート
server.listen(3000, () => {
  console.log('Server started on port 3000');
});
