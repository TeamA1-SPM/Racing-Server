import socketio

# Erstelle ein Socket.IO-Client-Objekt
sio = socketio.Client()

# Event-Handler für die Verbindungsherstellung
@sio.event
def connect():
    print('Verbindung hergestellt')

# Event-Handler für Nachrichten vom Server
@sio.event
def message(data):
    print('Nachricht vom Server:', data)

# Event-Handler für die Verbindungstrennung
@sio.event
def disconnect():
    print('Verbindung getrennt')

# Starte den Client und versuche, eine Verbindung zum Server herzustellen
sio.connect('http://racing-server-test.onrender.com')

# Warte auf Benutzereingabe, um die Verbindung zu trennen
input('Drücke Enter, um die Verbindung zu trennen...\n')

# Trenne die Verbindung
sio.disconnect()
