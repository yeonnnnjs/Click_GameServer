const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer();
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000", 
        methods: ["GET", "POST"], 
      },
});

const rooms = {};

io.on('connection', (socket) => {
  console.log(`Connected. Socket ID: ${socket.id}`);

  socket.on('createRoom', (roomName, playerName) => {
    console.log("roomCreated", roomName, playerName);
    if (!rooms[roomName]) {
      rooms[roomName] = { players: [], readyCount: 0 };
      rooms[roomName].players.push({ id: socket.id, name: playerName });
      socket.join(roomName);
      socket.emit('roomCreated', roomName, rooms[roomName].players);
    }
  });

  socket.on('joinRoom', (roomName, playerName) => {
      console.log("updatePlayers", roomName, playerName);
    if (rooms[roomName]) {
      socket.join(roomName);
      rooms[roomName].players.push({ id: socket.id, name: playerName });
      io.to(roomName).emit('updatePlayers', rooms[roomName].players);
    }
  });

  socket.on('ready', (roomName) => {
    if (rooms[roomName]) {
      rooms[roomName].readyCount++;
      if (rooms[roomName].readyCount === 2) {
        startGame(roomName);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`Disconnected. Socket ID: ${socket.id}`);
  });
});

function startGame(roomName) {
  console.log("Start game! ", roomName);
}

server.listen(8100, () => {
  console.log('WebSocket server running on 8100');
});
