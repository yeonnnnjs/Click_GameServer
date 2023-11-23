const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer();
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = {};

io.on('connection', (socket) => {
  console.log(`Connected. Socket ID: ${socket.id}`);

  socket.on('createRoom', (roomName, playerName) => {
    console.log("roomCreated", roomName, playerName);
    if (!rooms[roomName]) {
      rooms[roomName] = { players: {}, readyCount: 0, maker: playerName, roomName: roomName };
      rooms[roomName].players[playerName] = { id: socket.id, name: playerName, count: 0, isMaker: true };
      
      // client.hset(ROOMS_KEY, roomName, roomData, (err) => {
      //   if (err) {
      //     console.error('Redis SET 오류:', err);
      //   } else {
      //     console.log('Redis SET 완료');
      //   }
      // });

      socket.join(roomName);
      socket.emit('roomCreated', roomName, rooms[roomName].players);
      io.emit('roomList', rooms);
    }
    else {
      socket.emit('errorHandling', "같은 이름의 방이 존재합니다.");
    }
  });

  socket.on('joinRoom', (roomName, playerName) => {
    console.log("updatePlayers", roomName, playerName);
    // client.hget(ROOMS_KEY, roomName, (err, roomData) => {
    //   if (err) {
    //     console.error('Redis GET 오류:', err);
    //   } else {
    //     const room = JSON.parse(roomData);
        
    //     const updatedRoomData = JSON.stringify(room);
    //     client.hset(ROOMS_KEY, roomName, updatedRoomData, (err) => {
    //       if (err) {
    //         console.error('Redis SET 오류:', err);
    //       } else {
    //         console.log('Redis SET 완료');
    //       }
    //     });
    //   }
    // });
    if (rooms[roomName]) {
      rooms[roomName].players[playerName] = { id: socket.id, name: playerName, count: 0, isMaker: false };
      io.to(roomName).emit('updatePlayers', rooms[roomName].players);
      socket.join(roomName);
      socket.emit('joinRoom', rooms[roomName]);
      io.emit('roomList', rooms);
    }
    else {
      socket.emit('errorHandling', "해당 이름의 방이 없습니다.");
    }
  });

  socket.on('getRoomList', () => {
    socket.emit('roomList', rooms);
  });

  socket.on('readyOnWait', (roomName) => {
    io.to(roomName).emit('inGame');
  });

  socket.on('leaveRoom', (roomName, playerName) => {
    console.log("leavePlayers", roomName, playerName);
    if (rooms[roomName]) {
      socket.leave(roomName);
      delete rooms[roomName].players[playerName];
      if (Object.keys(rooms[roomName].players).length == 0) {
        delete rooms[roomName];
        socket.emit('outGame');
        io.emit('roomList', rooms);
      }
      else {
        socket.emit('errorHandling', "나가기 오류, 새로고침하세요:)");
      }
    }
  });

  socket.on('readyOnGame', (roomName) => {
    console.log("roomName : " + roomName, "rooms : " + rooms[roomName]);
    rooms[roomName].readyCount++;
    if (rooms[roomName].readyCount == Object.keys(rooms[roomName].players).length) {
      io.to(roomName).emit('gameStart');
      startTimer(roomName);
    }
  });

  socket.on('addResult', (roomName, playerName, count) => {
    rooms[roomName].players[playerName].count = count;
    io.to(roomName).emit('result', rooms[roomName].players);
  })

  socket.on('disconnect', () => {
    const roomName = findRoomByPlayerId(socket.id);
    if (roomName) {
      delete rooms[roomName].players[playerName];
      if (Object.keys(rooms[roomName].players).length == 0) {
        delete rooms[roomName];
      }
      io.emit('roomList', rooms);
    }
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

const findRoomByPlayerId = (id) => {
  for (const roomName in rooms) {
    if (rooms[roomName].players.id == id) {
      return roomName;
    }
  }
  return null;
}

const findPlayerBySockerId = (id, roomName) => {
  for (const player in rooms[roomName].players) {
    if (player.id == id) {
      return player;
    }
  }
  return null;
}

server.listen(8100, () => {
  console.log('WebSocket server running on 8100');
});