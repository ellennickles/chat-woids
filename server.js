// Thank you, Mimi Yin,
// for teaching me how to make a socket server in Collective Play Spring 2018!

let port = process.env.PORT || 8000;
let express = require('express');
let app = express();
let server = require('http').createServer(app).listen(port, function() {
  console.log('Server listening at port: ', port);
});
let io = require('socket.io').listen(server);

app.use(express.static('public'));

// Listen for individual clients to connect
io.sockets.on('connection',
// Callback function on connection, comes back with a socket object
  function(socket) {
    console.log("We have a new client: " + socket.id);
    // Listen for data from this client
    socket.on('message', function(data) {
      // Data can be numbers, strings, objects
      // console.log("Received: 'message' " + data);

      // Send it to all clients, including this one
      io.sockets.emit('message', data);
    });
    // Listen for this client to disconnect
    socket.on('disconnect', function() {
      console.log("Client has disconnected " + socket.id);
    });
  }
);
