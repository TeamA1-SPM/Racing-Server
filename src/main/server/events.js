// import {} from "./function.js"

// server.js
const http = require('http');
const fs = require('fs');

const socketIO = require('socket.io');
// const { toUnicode } = require('punycode'); <- Braucht man das??

const server = http.createServer();
const io = socketIO(server);

const connectedSockets = {};

const searchLobby = {};

const lobbyID = {};

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

  connectedSockets[socket.id] = {"name" : false, "lobby": false};
  socket.emit("message", "Verbindung aufgebaut");
  console.log(socket.id);

  

  
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
    // Wenn eingeloggt dann ist Suche lobby möglich

    // Wenn keine lobby gefunden werden kann (keine da oder alle voll) -> neue erstellen und warten bis voll

    // ...

    

  });



  // Implementierung für den Login eines Spielers
  socket.on('login', (username, passwort) => {
      let correct_login_data = false;
      const users = read_users();
      correct_login_data = users.some(user => user.username === account_data.username && user.passwort === account_data.passwort);

      if(correct_login_data){
        // TODO: Hier Nachricht an den User, sockit emit...
        // zB. "Erfolgreich eingeloggt"
        // Was passiert wenn sich eingeloggt wurde? 
      }else{
        // TODO: Diese Nachricht muss zurück an den Client
        // Was passiert wenn der Client die Daten falsch eingegeben hat
        console.log("does not work");
        
        
      }
  });


  // Implementierung für den Login eines Spielers
  socket.on('logout', () => {
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

      if(user_exist){
        // TODO: Diese Nachricht muss zurück an den Client
        // Was passiert wenn der Name schon vergeben ist?
        console.log("does not work");
      }else{
        register_users(users, account_data);
        
        // TODO: Hier Nachricht an den User, sockit emit...
        // zB. "Account wurde erfolgreich angelegt"
      }

  });


});

function read_users(){
  try {
      const data = fs.readFileSync('src/main/server/users.json', 'utf-8');
      const users = JSON.parse(data).users;
      return users;
    } catch (error) {
      console.log(error);
      return false;
    }
}


function register_users(users, account_data){
  try {
      // Array wird um die neuen Daten erweitert
      users.push(account_data);
      // Erweitertes Array wird in JSON-Format in die Datei geschrieben
      fs.writeFileSync('src/main/server/users.json', JSON.stringify({users}, null, 2) ,'utf-8');
      
    } catch (error) {
      // Fehlerbehandlung
      console.log(error);
      return false;
    }
}






