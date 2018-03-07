var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

http.listen(3000, '0.0.0.0', function() {
  console.log("listening on port *:3000");
});


// var numusers = 0;

io.on('connection', function(socket) {
  var useradded = false;


  socket.on('add user', function(data) {
    if (useradded) return;
    // console.log(username + " connected.");
    // store username in the socket session
    socket.username = data.username;
    if (socket.room)
      socket.leave(socket.room);
    socket.room = data.room;
    socket.join(socket.room);


    // numusers++;
    // socket.numusers = numusers;

    // console.log(io.sockets.adapter.rooms[socket.room + ''].length);
    var numusers = io.sockets.adapter.rooms[socket.room + ''].length;
    socket.numusers = numusers;
    useradded = true;
    io.sockets.in(socket.room).emit('login', {
      numusers: socket.numusers
    });
    // broadcast about a user joined chat
    socket.broadcast.to(socket.room).emit('user joined', {
      username: socket.username,
      numusers: socket.numusers
    });
  });

  socket.on('new message', function(data) {
    socket.broadcast.to(socket.room).emit('new message', {
      username: socket.username,
      message: data
    });
  });
  // let other that user is typing
  socket.on('typing', function() {
    socket.broadcast.to(socket.room).emit('typing', {
      username: socket.username
    });
  });
  // let other that user stops typing
  socket.on('stop typing', function() {
    socket.broadcast.to(socket.room).emit('stop typing', {
      username: socket.username
    });
  });
  socket.on('disconnect', function() {
    // if (useradded)
    //   numusers--;    
    socket.numusers = socket.numusers - 1;
    socket.broadcast.to(socket.room).emit('user left', {
      username: socket.username,
      numusers: socket.numusers
    });
  });
});