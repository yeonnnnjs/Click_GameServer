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
      rooms[roomName] = { players: {}, readyCount: 0 };
      rooms[roomName].players[playerName] = { id: socket.id, name: playerName, count: 0 };
      socket.join(roomName);
      socket.emit('roomCreated', roomName, rooms[roomName].players);
    }
  });

  socket.on('joinRoom', (roomName, playerName) => {
      console.log("updatePlayers", roomName, playerName);
    if (rooms[roomName]) {
      socket.join(roomName);
      rooms[roomName].players[playerName] = { id: socket.id, name: playerName, count: 0 };
      io.to(roomName).emit('updatePlayers', rooms[roomName].players);
      if(Object.keys(rooms[roomName].players).length === 2) {
        console.log("In game!", roomName);
        io.to(roomName).emit('inGame', roomName);
      }
    }
  });

  socket.on('ready', (roomName) => {
    if (rooms[roomName]) {
      rooms[roomName].readyCount++;
      if (rooms[roomName].readyCount === 2) {
        console.log("Start game! ", roomName);
        io.to(roomName).emit('gameStart', roomName);
        startTimer(roomName);
      }
    }
  });

  socket.on('addResult', (roomName, name, count) => {
    rooms[roomName].players[name].count = count;
    io.to(roomName).emit('result', rooms[roomName].players);
  })

  socket.on('disconnect', () => {
    console.log(`Disconnected. Socket ID: ${socket.id}`);
  });
});

const startTimer = (roomName) => {
  let time = 0;

  const timerInterval = setInterval(() => {
    time++;
    console.log(time);
    io.to(roomName).emit('timer', time);
  }, 1000);

  setTimeout(() => {
    clearInterval(timerInterval);
    io.to(roomName).emit('gameEnd');
  }, 30000);
};

server.listen(8100, () => {
  console.log('WebSocket server running on 8100');
});
