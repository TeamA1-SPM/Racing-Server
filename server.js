/*========== SERVER ==========*/

/* Imports */
const http = require('http');
const fs = require('fs');
const path = require('path');
const socketIO = require('socket.io');
const { Socket } = require('dgram');

/* Erstelle einen absoluten Pfad zur users.json-Datei */
const users_file_path = path.join(__dirname, 'data', 'users.json');

/* Erstelle einen absoluten Pfad zur lobbys.json-Datei */
const lobbys_file_path = path.join(__dirname, 'data', 'lobbys.json');

/* Server erzeugen und socketIO Server zuweisen */
const PORT = process.env.PORT || 3000;
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
  connected_sockets[socket.id] = { "username": null, "loggedIn": false, "lobbyID": null };

  // Client über erfolgreiche Verbindung informieren
  socket.emit("message", "Connected to Sever!");


  /* Wird aufgerufen, wenn Client Verbindung zum Server trennt */
  socket.on('disconnect', () => {
    // TODO: Bei einem disconnect, soll auch ein Logout durchgeführt werden
    console.log('Client ', socket.id, ' disconnected!');
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
          players.player2 = {
            "socketID": socket.id,
            "fastestLap": null,
            "finished": false,
            "rendered": false
          }

          connected_sockets[socket.id].lobbyID = lobbyID;

          // TODO: start_game muss von den Client abgefangen werden. Hier werden Daten (gerade nur gegnerischer Spielername) an den den jeweils anderen Client übergeben
          // +- 0,5 auf x Koordinate
          io.to(players.player1.socketID).emit('start_game', connected_sockets[players.player2.socketID].username);
          io.to(players.player2.socketID).emit('start_game', connected_sockets[players.player1.socketID].username);

          found_lobby = true;
          //jetzt kann eine Strecke ausgewählt werden
          choose_track();
        }
      }

      // Prüfen, ob keine Lobby gefunden wurde
      if (!found_lobby) {
        // Neue Lobby erstellen
        let new_lobbyID = get_last_lobby_id() + 1;
        active_lobbys.set(
          new_lobbyID,
          {
            player1: {
              "socketID": socket.id,
              "fastestLap": null,
              "finished": false,
              "rendered": false
            },
            player2: null
          }
        )

        connected_sockets[socket.id].lobbyID = new_lobbyID;
      }

    }
  });


  /* Wird aufgerufen, wenn Client sich einloggt */
  socket.on('login', (username, passwort) => {
    const users = read_users();
    let correct_login_data = users.some(user => user.username === username && user.passwort === passwort);
    let login_bool = false;

    if (correct_login_data) {
      connected_sockets[socket.id].username = username;
      connected_sockets[socket.id].loggedIn = true;
      console.log(username, "logged in!")
      login_bool = true;

      /* TODO: Die users.json um ("loggedIn": false) erweitern und nach erfolgreichem einloggen auf true setzen. 
      Diese Bedinung dass loggedIn = false ist muss mit in die Einlogg-Bedingung aufgenommen werden, um zu verhindern,
      dass sich der gleiche Account öfters einloggen kann */

    } else {
      console.log(username, " cannot logged in!");
    }
    socket.emit("login_success", login_bool);
  });


  /* Wird aufgerufen, wenn Client sich ausloggt */
  socket.on('logout', () => {
    connected_sockets[socket.id] = { "username": null, "loggedIn": false, "lobbyID": null };
  });


  /* Wird aufgerufen, wenn Client sich registriert */
  socket.on('register', (account_data) => {
    let user_exists = false;
    const users = read_users();
    let register_bool = false;

    // Checkt ob der User in users.json enthalten ist
    user_exists = users.some(user => user.username === account_data.username);

    if (!user_exists) {
      console.log("Registration successful!");
      register_bool = true;
      register_users(users, account_data);

    } else {
      console.log("User aleready exists!");
    }

    socket.emit("register_success", register_bool);

  });


  /* Wird aufgerufen, wenn Client lap time sendet */
  socket.on('lap_time', (time) => {
    // TODO: Fehlerbehandlung: Was passiert wenn ein Spieler mitten im Spiel die Verbindung unterbricht?
    // TODO: Was ist wenn beide Bestzeiten gleich sind?
    console.log(connected_sockets[socket.id].username, "has driven a lap time of", time, "!");

    let current_lobby_ID = connected_sockets[socket.id].lobbyID;
    let current_lobby = active_lobbys.get(current_lobby_ID);

    // In der Lobby in der der Socket ist die Bestzeit setzen
    if ((socket.id == current_lobby.player1.socketID) && ((current_lobby.player1.fastestLap > time) || (current_lobby.player1.fastestLap == null))) {
      current_lobby.player1.fastestLap = time;
      io.to(current_lobby.player1.socketID).emit('best_lap_times', current_lobby.player1.fastestLap, current_lobby.player2.fastestLap);
      io.to(current_lobby.player2.socketID).emit('best_lap_times', current_lobby.player2.fastestLap, current_lobby.player1.fastestLap);
    }

    if ((socket.id == current_lobby.player2.socketID) && ((current_lobby.player2.fastestLap > time) || (current_lobby.player2.fastestLap == null))) {
      current_lobby.player2.fastestLap = time;
      io.to(current_lobby.player1.socketID).emit('best_lap_times', current_lobby.player1.fastestLap, current_lobby.player2.fastestLap);
      io.to(current_lobby.player2.socketID).emit('best_lap_times', current_lobby.player2.fastestLap, current_lobby.player1.fastestLap);
    }

  });


  /* Wird aufgerufen, wenn Client sein race abgeschlossen hat */
  socket.on('finished_race', () => {
    //current_lobby = connected_sockets[socket.id].lobbyID;

    let current_lobby_ID = connected_sockets[socket.id].lobbyID;
    let current_lobby = active_lobbys.get(current_lobby_ID);

    // Prüfen, ob Gegner auch fertig
    if (socket.id == current_lobby.player1.socketID) {
      current_lobby.player1.finished = true;
      if (current_lobby.player2.finished == true) {
        game_ends(current_lobby.player1.fastestLap < current_lobby.player2.fastestLap, current_lobby.player1, current_lobby.player2, lobbyID);
      }
    }

    // Prüfen, ob Gegner auch fertig
    if (socket.id == current_lobby.player2.socketID) {
      current_lobby.player2.finished = true;
      if (current_lobby.player1.finished == true) {
        game_ends(current_lobby.player1.fastestLap < current_lobby.player2.fastestLap, current_lobby.player1, current_lobby.player2, lobbyID);
      }
    }

  });

  /* Wird aufgerufen wenn ein client die Grafische Darstellung des Spiels erfolgreich geladen hat */
  socket.on('game_rendered', () => {
    let current_lobby_ID = connected_sockets[socket.id].lobbyID;
    let current_lobby = active_lobbys.get(current_lobby_ID);

    //prüfen ob das spiel geladen wurde
    if (socket.id == current_lobby.player1.socketID) {
      current_lobby.player1.rendered = true;
      if (current_lobby.player2.rendered == true) {
        start_countdown;
      }
    }

    if (socket.id == current_lobby.player2.socketID) {
      current_lobby.player2.rendered = true;
      if (current_lobby.player1.rendered == true) {
        start_countdown;
      }
    }

  });

  /* Übergibt die Position des Spielers an den Gegner */
  socket.on('display_player', (one, two, three, four) => {
    let current_lobby_ID = connected_sockets[socket.id].lobbyID;
    let current_lobby = active_lobbys.get(current_lobby_ID);

    if (socket.id == current_lobby.player1.socketID) {
      io.to(current_lobby.player2.socketID).emit('epp', one, two, three, four);
    }

    if (socket.id == current_lobby.player2.socketID) {
      io.to(current_lobby.player1.socketID).emit('epp', one, two, three, four);
    }
  });

});


/* Funktion ließt alle historischen lobbys aus lobbys.json */
function read_lobbys() {
  try {
    const data = fs.readFileSync(lobbys_file_path, 'utf-8');
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
    const data = fs.readFileSync(users_file_path, 'utf-8');
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
    fs.writeFileSync(users_file_path, JSON.stringify({ users }, null, 2), 'utf-8');
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
    fs.writeFileSync(lobbys_file_path, JSON.stringify({ lobbys }, null, 2), 'utf-8');
  } catch (error) {
    console.log(error);
    return false;
  }
}


/* Funktion beendet das Spiel einer Lobby */
function game_ends(player1_won, player1, player2, lobbyID) {
  // Prüfen, ob Spieler1 gewonnen hat
  if (player1_won) {
    // @Param Event_Name, Enemy Player Name, Fastest Lap, Enemy Fastest Lap, Won?
    io.to(player1.socketID).emit('end_game', connected_sockets[player2.socketID].username, player1.fastestLap, player2.fastestLap, true);
    io.to(player2.socketID).emit('end_game', connected_sockets[player1.socketID].username, player2.fastestLap, player2.fastestLap, false);
  } else {
    io.to(player1.socketID).emit('end_game', connected_sockets[player2.socketID].username, player1.fastestLap, player2.fastestLap, false);
    io.to(player2.socketID).emit('end_game', connected_sockets[player1.socketID].username, player2.fastestLap, player2.fastestLap, true);
  }

  // JSON-Data zum schreiben in lobbys.json
  let lobby_data = {
    "lobbyID": lobbyID,
    "player1": {
      "username": connected_sockets[player1.socketID].username,
      "fastestLap": player1.fastestLap,
      "won": player1_won

    },
    "player2": {
      "username": connected_sockets[player2.socketID].username,
      "fastestLap": player2.fastestLap,
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


/* Countdown Funktion die allen Sockets einer Lobby eine Start signal schickt */
async function start_countdown() {
  let current_lobby_ID = connected_sockets[socket.id].lobbyID;
  let current_lobby = active_lobbys.get(current_lobby_ID);

  for (let index = 3; index >= 0; index--) {
    io.to(current_lobby.player1.socketID).emit('countdown', index);
    io.to(current_lobby.player2.socketID).emit('countdown', index);
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

/* Funktion generiert eine Zufällige Zahl zwischen 1 und 10 um sich für eine der 10 Strecken zu entscheiden */
function choose_track() {
  let current_lobby_ID = connected_sockets[socket.id].lobbyID;
  let current_lobby = active_lobbys.get(current_lobby_ID);

  //Zufällige ganze Zahl zwischen 1 und 10
  let track = Math.floor((Math.random() * 10) + 1);

  io.to(current_lobby.player1.socketID).emit('race_Track', track);
  io.to(current_lobby.player2.socketID).emit('race_Track', track);
}


