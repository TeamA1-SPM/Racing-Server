/*========== SERVER ==========*/

/* Imports */
const http = require('http');
const fs = require('fs');
const socketIO = require('socket.io');
const { Socket } = require('dgram');

/* Server erzeugen und socketIO Server zuweisen */
const PORT = 3000;
const server = http.createServer();
const io = socketIO(server);

/* Speichert die verbundenen Sockets */
const connected_sockets = {};

/* Speichert die aktiven Lobbys */
const active_lobbys = new Map();


/* Server hört auf eingehende Events auf festgelegtem Port */
server.listen(PORT, () => {
  // Hier müssen alle bereits angelegten Spieler geladen werden, damit später überprüft werden kann ob ein login funktioniert oder nicht
  console.log(`Server listening on port ${PORT}`);
});


/* Bei Verbindung eines Clients mit dem Server wird ein Socket für den Client angelegt */
io.on('connection', (socket) => {
  console.log('Client', socket.id, 'connected!');

  // Neuen Client speichern
  connected_sockets[socket.id] = {"username": null, "loggedIn": false};

  // Client über erfolgreiche Verbindung informieren
  socket.emit("message", "Connected to Sever!");


  /* Wird aufgerufen, wenn Client Verbindung zum Server trennt */
  socket.on('disconnect', () => {
    // TODO: Bei einem disconnect, soll auch ein Logout durchgeführt werden
    console.log('Client ', socket.id ,' disconnected!');
  });


  /* Wird aufgerufen, wenn Client eine Lobby sucht */
  socket.on('find_lobby', () => {
    // Prüfen, ob User eingeloggt ist
    if (connected_sockets[socket.id].loggedIn == true) {
      let found_lobby = false;

      // Durch alle aktiven Lobbys iterieren
      for (const [lobbyID, players] of active_lobbys) {
        // Wenn freie Lobby gefunden, Client als Gegner eintragen
        if (players.player1 != null && players.player2 == null) {
          players.player2 = 
          {
            "socketID": socket.id,
            "fastestLap": null,
            "finished": false
          }

          // TODO: start_game muss von den Client abgefangen werden. Hier werden Daten (gerade nur gegnerischer Spielername) an den den jeweils anderen Client übergeben
          // +- 0,5 auf x Koordinate
          io.to(players.player1.socketID).emit('start_game', connected_sockets[players.player2.socketID].username);
          io.to(players.player2.socketID).emit('start_game', connected_sockets[players.player1.socketID].username);

          found_lobby = true;
        };
      };

      // Prüfen, ob keine Lobby gefunden wurde
      if (!found_lobby) {
        // Neue Lobby erstellen
        active_lobbys.set(
          get_last_lobby_id() + 1, 
          {
          player1: {
            "socketID": socket.id,
            "fastestLap": null,
            "finished": false
          },
          player2: null
        })
      }

    }
  });


  /* Wird aufgerufen, wenn Client sich einloggt */
  socket.on('login', (username, passwort) => {
    const users = read_users();
    let correct_login_data = users.some(user => user.username === username && user.passwort === passwort);

    if (correct_login_data) {
      connected_sockets[socket.id].username = username;
      connected_sockets[socket.id].loggedIn = true;
      console.log(username, "logged in!")
      // TODO: Hier Nachricht an den User, sockit emit...
      // zB. "Erfolgreich eingeloggt"
      // Was passiert wenn sich eingeloggt wurde? 
    } else {
      // TODO: Diese Nachricht muss zurück an den Client
      // Was passiert wenn der Client die Daten falsch eingegeben hat
      console.log(username, " cannot logged in!");
    }
  });


  /* Wird aufgerufen, wenn Client sich ausloggt */
  socket.on('logout', () => {
    connected_sockets[socket.id] = {"username": null, "loggedIn": false};
  });


  /* Wird aufgerufen, wenn Client sich registriert */
  socket.on('register', (account_data) => {
    let user_exists = false;
    const users = read_users();

    // Checkt ob der User in users.json enthalten ist
    user_exists = users.some(user => user.username === account_data.username);

    if (user_exists) {
      // TODO: Diese Nachricht muss zurück an den Client
      // Was passiert wenn der Name schon vergeben ist?
      console.log("User aleready exists!");
    } else {
      register_users(users, account_data);
      // TODO: Hier Nachricht an den User, sockit emit...
      // zB. "Account wurde erfolgreich angelegt"
      console.log("Registration successful!");
    }
  });


  /* Wird aufgerufen, wenn Client lap time sendet */
  socket.on('lap_time', (time) => {
    // TODO: Fehlerbehandlung: Was passiert wenn ein Spieler mitten im Spiel die Verbindung unterbricht?
    // TODO: Was ist wenn beide Bestzeiten gleich sind?
    console.log(connected_sockets[socket.id].username, "has driven a lap time of", time , "!");

    // In der Lobby in der der Socket ist die Bestzeit setzen
    for (const [lobbyID, players] of active_lobbys) {
      if ((socket.id == players.player1.socketID && players.player1.fastestLap > time) || (players.player1.fastestLap == null)) {
        players.player1.fastestLap = time;
      };

      // TODO: Nur für Test-Zwecke
      if (players.player2 != null) {
        if ((socket.id == players.player2.socketID && players.player2.fastestLap > time) || (players.player1.fastestLap == null)) {
          players.player2.fastestLap = time;
        }
      }

    }

  });


  /* Wird aufgerufen, wenn Client sein race abgeschlossen hat */
  socket.on('finished_race', () => {
    // Durch alle aktiven Lobbys iterieren
    for (const [lobbyID, players] of active_lobbys) {
      // Prüfen, ob Gegner auch fertig
      if (socket.id == players.player1.socketID) {
        players.player1.finished = true;
        // TODO: Test
        if (players.player2 != null) {
          if (players.player2.finished == true) {
            game_ends(players.player1.fastestLap < players.player2.fastestLap, players, lobbyID);
          }
        }
      }

      // TODO: Nur für Test-Zwecke 
      // Prüfen, ob Gegner auch fertig
      if (players.player2 != null) {
        if (socket.id == players.player2.socketID) {
          players.player2.finished = true;
          if (players.player1.finished == true) {
            game_ends(players.player1.fastestLap < players.player2.fastestLap, players, lobbyID);
          }
        }
      }

    }
  });

});


/* Funktion ließt alle historischen lobbys aus lobbys.json */
function read_lobbys() {
  try {
    const data = fs.readFileSync('./lobbys.json', 'utf-8');
    const lobbys = JSON.parse(data).lobbys;
    return lobbys;
  } catch (error) {
    console.log(error);
    return false;
  }
}


/* Funktion ließt alle registrierten user aus users.json */
function read_users() {
  try {
    const data = fs.readFileSync('./users.json', 'utf-8');
    const users = JSON.parse(data).users;
    return users;
  } catch (error) {
    console.log(error);
    return false;
  }
}


/* Funktion schreibt registrierten user in users.json */
function register_users(users, account_data) {
  try {
    // Array wird um die neuen Daten erweitert
    users.push(account_data);
    // Erweitertes Array wird in JSON-Format in die Datei geschrieben
    fs.writeFileSync('./users.json', JSON.stringify({ users }, null, 2), 'utf-8');
  } catch (error) {
    console.log(error);
    return false;
  }
}


/* Funktion schreibt neue Lobby in lobbys.json */
function write_lobby(lobby_data) {
  try {
    // Array wird um die neuen Daten erweitert
    let lobbys = read_lobbys();
    lobbys.push(lobby_data);
    // Erweitertes Array wird in JSON-Format in die Datei geschrieben
    fs.writeFileSync('./lobbys.json', JSON.stringify({ lobbys }, null, 2), 'utf-8');
    } catch (error) {
    console.log(error);
    return false;
  }
}


/* Funktion beendet das Spiel einer Lobby */
function game_ends(player1_won, players, lobbyID) {
  // Prüfen, ob Spieler1 gewonnen hat
  if (player1_won) {
    /* 
    @Param Event_Name, Enemy Player Name, Fastest Lap, Enemy Fastest Lap, Won?
    */
    io.to(players.player1.socketID).emit('end_game', connected_sockets[players.player2.socketID].username, players.player1.fastestLap, players.player2.fastestLap, true);
    io.to(players.player2.socketID).emit('end_game', connected_sockets[players.player1.socketID].username, players.player2.fastestLap, players.player2.fastestLap, false);
  } else {
    io.to(players.player1.socketID).emit('end_game', connected_sockets[players.player2.socketID].username, players.player1.fastestLap, players.player2.fastestLap, false);
    io.to(players.player2.socketID).emit('end_game', connected_sockets[players.player1.socketID].username, players.player2.fastestLap, players.player2.fastestLap, true);
  }

  // JSON-Data zum schreiben in lobbys.json
  let lobby_data = {
    "lobbyID": lobbyID,
    "player1": {
      "username": connected_sockets[players.player1.socketID].username,
      "fastestLap": players.player1.fastestLap,
      "won": player1_won

    },
    "player2": {
      "username": connected_sockets[players.player2.socketID].username,
      "fastestLap": players.player2.fastestLap,
      "won": !(player1_won)
    }
  }

  // Lobby in lobbys.json sichern
  write_lobby(lobby_data);

  // Lobby wird gelöscht
  active_lobbys.delete(lobbyID);

}


/* Funktion beendet das Spiel einer Lobby */
function get_last_lobby_id() {
  let lobbys = read_lobbys();
  return lobbys[lobbys.length - 1].lobbyID;
}






