$(function() {
  var FADE_TIME = 150;
  var TYPING_TIMER_LENGTH = 400;
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // initialize variables
  var $window = $(window);
  var $roomInput = $('#room');
  var $usernameInput = $('#username');
  var $messages = $('.messages'); // Message Area
  var $inputMessage = $('.inputMessage');
  var $welcome = $('#welcomeMSG');


  var $loginpage = $('.login');
  var $chatpage = $('.chatroom');

  // prompt for setting a username
  var username;
  var room;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput;

  var socket = io();

  $window.keydown(function(event) {
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      // $currentInput.focus();
    }

    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setusername();
      }
    }
  });


  // set clien's username
  function setusername() {
    username = cleanInput($usernameInput.val().trim());
    room = cleanInput($roomInput.val().trim());
    // if the username is valid
    if (username && room) {
      username = formatUsername(username);
      $loginpage.fadeOut();
      $chatpage.show();
      $loginpage.off('click');
      $currentInput = $inputMessage.focus();

      // Inform server about client
      socket.emit('add user', {
        username: username,
        room: room
      });
    }
  }

  function formatUsername(username) {
    return username.charAt(0).toUpperCase() + username.slice(1);
  }

  function sendMessage() {
    var message = $inputMessage.val();
    message = cleanInput(message);
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      }, {
        iamuser: true
      });
      // send new message to the Server
      socket.emit('new message', message);
    }
  }

  function cleanInput(input) {
    return $('<div/>').text(input).html();
  }

  function addChatMessage(data, options) {
    var $typingMessages = getTypingMessages(data);

    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }
    var myclass = 'nice';
    if (options.iamuser) {
      myclass += ' right-table';
    } else {
      myclass += ' left-table';
    }
    var $usernameDiv = $('<span class="username"/>')
      .text(data.username + ": ")
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);
    var typingClass = data.typing ? 'typing' : '';

    var $niceblock = $('<div class="' + myclass + '"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($niceblock);
    addMessageElement($messageDiv, options);
  }

  function getTypingMessages(data) {
    return $('.typing.message').filter(function(i) {
      return $(this).data('username') === data.username;
    });
  }

  function getUsernameColor(username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  function addMessageElement(el, options) {
    var $el = $(el);
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $('div.chatarea')[0].scrollTop = $('div.chatarea')[0].scrollHeight;
  }

  function log(message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  function addChatTyping(data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  function removeChatTyping(data) {
    getTypingMessages(data).fadeOut(function() {
      $(this).remove();
    });
  }

  function updateTyping() {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();
      setTimeout(function() {
        var typingTimer = (new Date()).getTime();
        var timediff = typingTimer - lastTypingTime;
        if (timediff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  $inputMessage.on('input', function() {
    updateTyping();
  });
  $loginpage.click(function() {
    // $currentInput.focus();
  });
  $inputMessage.click(function() {
    $inputMessage.focus();
  });

  function addParticipantsMessage(data) {
    var message = '';
    if (data.numusers === 1) {
      message += "there's 1 participant";
    } else {
      message += "there are " + data.numusers + " participants";
    }
    log(message);
  }
  socket.on('login', function(data) {
    connected = true;
    var message = 'Welcome to Chat Room';
    log(message, {
      prepend: true
    });
    $welcome.text('Welcome ' + cleanInput($usernameInput.val().trim()) + " to the chat Room-" + cleanInput($roomInput.val().trim()));
    addParticipantsMessage(data);
  });
  socket.on('new message', function(data) {
    addChatMessage(data);
  });
  socket.on('user joined', function(data) {
    console.log("User Joined");
    log(data.username + ' joined');
    addParticipantsMessage(data);
  });
  socket.on('user left', function(data) {
    if (data.username) {
      log(data.username + ' left');
      addParticipantsMessage(data);
      removeChatTyping(data);
    }
  });
  socket.on('typing', function(data) {
    addChatTyping(data);
  });
  socket.on('stop typing', function(data) {
    removeChatTyping(data);
  });
  socket.on('disconnect', function(data) {
    log('You have been disconnected');
  });

});