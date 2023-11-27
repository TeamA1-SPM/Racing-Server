# python_client.py
import socketio

sio = socketio.Client()

def register():
    data = {
        'username': 'tobi',
        'passwort': '123456'
    }
    sio.emit('register', data)

@sio.event
def connect():
    #register()
    sio.emit('login', ("lewin", "123456") )
    sio.emit('findLobby')
    sio.emit('best_time', 100)
    sio.emit('finish')

    print('Connected to server')

@sio.event
def disconnect():
    sio.emit('logout')
    print('Disconnected from server')

@sio.event
def message(message):
    print("Message received: ", message)


@sio.event
def start_game(enemy_player):
    print("You play against: ", enemy_player)

sio.connect('http://localhost:3000')


while True:
    message = input()
    sio.emit('message', message)
