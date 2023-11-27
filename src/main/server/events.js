// import {} from "./function.js"

// server.js
const http = require('http');
const fs = require('fs');

const socketIO = require('socket.io');
// const { toUnicode } = require('punycode'); <- Braucht man das??

const server = http.createServer();
const io = socketIO(server);

const connectedSockets = {};

const searchingForLobby = [];

const active_lobby = new Map();

let lobby_count = 1;

//const lobbyID = {};

// Server hört auf eingehende Events auf festgelegtem Port
const PORT = 3000;
server.listen(PORT, () => {
  // Hier müssen alle bereits angelegten Spieler geladen werden, damit später überprüft werden kann ob ein login funktioniert oder nicht
  console.log(`Server listening on port ${PORT}`);
});



// Bei Verbindung wird ein Socket für den Client angelegt, Verbindung  erst nach -> Find Game
io.on('connection', (socket) => {
  // Warten auf 2 Connects, wie wird es abgefangen? Wenn zwei Spieler connected sind, wir die Info weitergegeben, dass das Spiel starten kann.
  console.log('Client connected');

  connectedSockets[socket.id] = { "username": null, "loggedIn": false };
  socket.emit("message", "Verbindung aufgebaut");
  console.log(socket.id);

  console.log(connectedSockets);




  // Event für disconnect
  socket.on('disconnect', () => {
    // TODO: Bei einem disconnect, soll auch ein Logout durchgeführt werden
    console.log('Client disconnected');
  });



  // Event für eingehende Nachricht
  // Wird hier an anderen Client weitergeleitet
  socket.on('message', (data) => {
    console.log('Message from client:', data);
    //io.emit('message', 'Server received your message: ' + data);
    socket.broadcast.emit('message', data);

  });


  // Implementierung für den Login eines Spielers
  socket.on('findLobby', () => {

    // Bin ich eingeloggt?
    if (connectedSockets[socket.id].loggedIn == true) {

      // Es ist eine Lobby bereits da
      console.log("I am the lobby: ", active_lobby);
      let found_lobby = false;

      // Ist eine Lobby noch nicht voll?
      for (const [lobbyId, players] of active_lobby) {

        // Dann erstelle Spiel und füge 2ten Spieler zur Map hinzu
        if (players.player1 != null && players.player2 == null) {
          players.player2 = {
            "socketID": socket.id,
            "fastestLap": null,
            "finished": false
          }
          found_lobby = true;

          // INFO: start_game muss von den Client abgefangen werden. Hier werden Daten (gerade nur gegnerischer Spielername) an den den jeweils anderen Client übergeben
          // +- 0,5 auf x Koordinate
          io.to(players.player1.socketID).emit('start_game', connectedSockets[players.player2.socketID].username);
          io.to(players.player2.socketID).emit('start_game', connectedSockets[players.player1.socketID].username);
        };
      };

      // Wird keine Lobby gefunden wird eine neue Lobby erstellt und der Spieler, der keine freie gefunden hat wird sofort hinzugefügt
      if (!found_lobby) {
        active_lobby.set(getLastLobbyID() + 1, {
          player1: {
            "socketID": socket.id,
            "fastestLap": null,
            "finished": false
          },
          player2: null
        });
        // Die Lobbys werden mitgezählt

      };
    };
  });



  // Implementierung für den Login eines Spielers
  socket.on('login', (username, passwort) => {
    let correct_login_data = false;
    const users = read_users();
    correct_login_data = users.some(user => user.username === username && user.passwort === passwort);

    if (correct_login_data) {
      connectedSockets[socket.id].username = username;
      connectedSockets[socket.id].loggedIn = true;
      // TODO: Hier Nachricht an den User, sockit emit...
      // zB. "Erfolgreich eingeloggt"
      // Was passiert wenn sich eingeloggt wurde? 
    } else {
      // TODO: Diese Nachricht muss zurück an den Client
      // Was passiert wenn der Client die Daten falsch eingegeben hat
      console.log("does not work");


    }
  });


  // Implementierung für den Login eines Spielers
  socket.on('logout', () => {
    connectedSockets[socket.id] = { "username": null, "loggedIn": false };
  });


  // Implementierung für die Registrierung eines Spielers
  socket.on('register', (account_data) => {
    // abhängig von der spieler_anlegen funktion

    let user_exist = false;
    const users = read_users();
    let index = 0;

    // Checkt ob der User in der JSON enthalten ist
    user_exist = users.some(user => user.username === account_data.username);

    console.log(user_exist);

    if (user_exist) {
      // TODO: Diese Nachricht muss zurück an den Client
      // Was passiert wenn der Name schon vergeben ist?
      console.log("does not work");
    } else {
      register_users(users, account_data);

      // TODO: Hier Nachricht an den User, sockit emit...
      // zB. "Account wurde erfolgreich angelegt"
    }

  });


  socket.on('best_time', (time) => {

    // TODO: Fehlerbehandlung: Was passiert wenn ein Spieler mitten im Spiel die Verbindung unterbricht?
    // TODO: Was ist wenn beide Bestzeiten gleich sind?

    console.log(connectedSockets[socket.id].username, " ist eine Rundenzeit von ", time, "gefahren!");

    // In der Lobby in der der Socket ist die Bestzeit setzen
    for (const [lobbyId, players] of active_lobby) {
      if ((socket.id == players.player1.socketID && players.player1.fastestLap > time) || (players.player1.fastestLap == null)) {
        players.player1.fastestLap = time;
      };

      // TODO: Nur für Test-Zwecke
      if (players.player2 != null) {
        if ((socket.id == players.player2.socketID && players.player2.fastestLap > time) || (players.player1.fastestLap == null)) {
          players.player2.fastestLap = time;
        };
      };
    };
  });


  socket.on('finish', () => {

    for (const [lobbyId, players] of active_lobby) {

      if (socket.id == players.player1.socketID) {
        players.player1.finished = true;

        // TODO: Test
        if (players.player2 != null) {
          if (players.player2.finished == true) {
            game_ends(players.player1.fastestLap < players.player2.fastestLap, players, lobbyId);
          }
        }
      }

      // TODO: Nur für Test-Zwecke 
      if (players.player2 != null) {
        if (socket.id == players.player2.socketID) {
          players.player2.finished = true;
          if (players.player1.finished == true) {
            game_ends(players.player1.fastestLap < players.player2.fastestLap, players, lobbyId);
          };
        };
      };
    }
  });


});


function read_users() {
  try {
    const data = fs.readFileSync('src/main/server/users.json', 'utf-8');
    const users = JSON.parse(data).users;
    return users;
  } catch (error) {
    console.log(error);
    return false;
  }
}


function register_users(users, account_data) {
  try {
    // Array wird um die neuen Daten erweitert
    users.push(account_data);
    // Erweitertes Array wird in JSON-Format in die Datei geschrieben
    fs.writeFileSync('src/main/server/users.json', JSON.stringify({ users }, null, 2), 'utf-8');

  } catch (error) {
    // Fehlerbehandlung
    console.log(error);
    return false;
  }
}

function game_ends(GG_player1, players, lobbyId) {

  //GG_player1 == true heißt, dass player 1 gewonnen hat
  //GG_player1 == false heißt, dass player 2 gewonnen hat

  if (GG_player1) {
    /* 
    @Param Event_Name, Enemy Player Name, Fastest Lap, Enemy Fastest Lap, Won?
    */
    io.to(players.player1.socketID).emit('end_game', connectedSockets[players.player2.socketID].username, players.player1.fastestLap, players.player2.fastestLap, true);
    io.to(players.player2.socketID).emit('end_game', connectedSockets[players.player1.socketID].username, players.player2.fastestLap, players.player2.fastestLap, false);
  }
  else {
    io.to(players.player1.socketID).emit('end_game', connectedSockets[players.player2.socketID].username, players.player1.fastestLap, players.player2.fastestLap, false);
    io.to(players.player2.socketID).emit('end_game', connectedSockets[players.player1.socketID].username, players.player2.fastestLap, players.player2.fastestLap, true);
  };


  let history_data = {
    "lobbyId": lobbyId,
    "player1": {
      "username": connectedSockets[players.player1.socketID].username,
      "fastestLap": players.player1.fastestLap,
      "won": GG_player1

    },
    "player2": {
      "username": connectedSockets[players.player2.socketID].username,
      "fastestLap": players.player2.fastestLap,
      "won": !(GG_player1)
    }
  }

  let lobbys = read_history();
  lobbys.push(history_data);


  console.log(active_lobby);


  fs.writeFileSync('src/main/server/history.json', JSON.stringify({ lobbys }, null, 2), 'utf-8', (err) => {
    if (err) {
      console.error('Fehler beim Schreiben der Datei:', err);
    } else {
      console.log('Benutzerdaten wurden erfolgreich zur Datei hinzugefügt.');
    }
  });

  // Lobby wird gelöscht
  active_lobby.delete(lobbyId);

}


function read_history() {
  try {
    const data = fs.readFileSync('src/main/server/history.json', 'utf-8');
    const history = JSON.parse(data).lobbys;
    return history;
  } catch (error) {
    console.log(error);
    return false;
  }
}


function getLastLobbyID() {
  let lobbys = read_history();


  console.log(lobbys[lobbys.length - 1].lobbyId);
  return lobbys[lobbys.length - 1].lobbyId;

}






