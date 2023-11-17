// server.js
const http = require('http');
const socketIO = require('socket.io');

const server = http.createServer();
const io = socketIO(server);

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('message', (data) => {
    console.log('Message from client:', data);
    io.emit('message', 'Server received your message: ' + data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
