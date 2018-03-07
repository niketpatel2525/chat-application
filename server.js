var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

http.listen(3000, function() {
  console.log("listening on port *:3000");
});


var numusers = 0;

io.on('connection', function(socket) {
  var useradded = false;
  socket.on('add user', function(username) {
    if (useradded) return;
    // console.log(username + " connected.");
    // store username in the socket session
    socket.username = username;
    numusers++;
    useradded = true;
    socket.emit('login', {
      numusers: numusers
    });
    // broadcast about a user joined chat
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numusers: numusers
    });
  });

  socket.on('new message', function(data) {
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });
  // let other that user is typing
  socket.on('typing', function() {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });
  // let other that user stops typing
  socket.on('stop typing', function() {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });
  socket.on('disconnect', function() {
    if (useradded)
      numusers--;
    socket.broadcast.emit('user left', {
      username: socket.username,
      numusers: numusers
    });
  });
});