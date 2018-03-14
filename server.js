var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var fs = require('fs');
var ss = require('socket.io-stream');
var oppressor = require('oppressor');



app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

http.listen(3000, '0.0.0.0', function() {
  console.log("listening on port *:3000");
});


// var numusers = 0;

var connection = [];


var storageserver = __dirname + "/storage/";
io.on('connection', function(socket) {
  connection.push(socket);
  var useradded = false;

  ss(socket).on('file', function(stream, data) {
    // var filename = path.basename(data.name);
    console.log(">> Stream find.  : " + new Date().toString());
    if (!fs.existsSync(storageserver)) {
      fs.mkdirSync(storageserver);
    }
    var ext = path.extname(data.name);
    var filename = new Date().getTime() + ext;
    console.log(filename);
    var write = fs.createWriteStream(storageserver + filename);

    stream.pipe(write);
    stream.on('error', function(e) {
      console.log("Error: " + new Date().toString());
      console.log(e);
    });

    stream.on('finish', function() {
      console.log("Stream Finished  :" + new Date().toString());
      for (var i in connection) {

        if (connection[i].room == socket.room && connection[i] != socket) {
          console.log("Out Stream to :: " + connection[i].username);
          var readStream = fs.createReadStream(storageserver + filename);
          var size = fs.statSync(storageserver + filename)["size"];
          console.log("Size: " + size);
          var outstream = ss.createStream({
            highWaterMark: size + 1024,
            objectMode: true
          });
          ss(connection[i]).emit('imageMessage', outstream, {
            name: filename,
            ext: ext,
            username: socket.username
          });
          readStream.pipe(outstream);
        }
      }
    });


    // stream.pipe(write).on('finish', function() {
    //   // console.log(socket);
    //   for (var i in connection) {
    //     console.log(connection[i]);
    //   }
    // });



    // stream.pipe(write).on('finish', function() {
    //   console.log("Broadcasting Image....");
    //   var readStream = fs.createReadStream(storageserver + filename, {
    //       encoding: 'binary'
    //     }),
    //     chunks = [],
    //     delay = 0;
    //   readStream.on('readable', function() {
    //     console.log('Image loading');
    //   });
    //   readStream.on('data', function(chunk) {
    //     chunks.push(chunk);
    //     socket.broadcast.to(socket.room).emit('imageMessage', {
    //       username: socket.username,
    //       chunk: chunk,
    //       isLoading: true
    //     });
    //   });
    //   readStream.on('end', function() {
    //     console.log('Image loaded');
    //     socket.broadcast.to(socket.room).emit('imageMessage', {
    //       username: socket.username,
    //       isLoading: false
    //     });
    //   });
    // });
  });

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

    var tmpconnection = [];
    for (var i in connection) {
      if (connection[i] != socket) {
        tmpconnection.push(connection[i]);
      }
    }
    connection = tmpconnection;

    socket.broadcast.to(socket.room).emit('user left', {
      username: socket.username,
      numusers: socket.numusers
    });
  });
});