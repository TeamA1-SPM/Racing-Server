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
    sio.emit('login', ("timo", "123456") )
    #sio.emit('find_lobby')
    #sio.emit('lap_time', 100)
    #sio.emit('finished_race')
    print('Connected to server')

@sio.event
def disconnect():
    sio.emit('logout')
    print('Disconnected from server')

@sio.event
def start_game(enemy_player):
    print("You play against: ", enemy_player)

@sio.event
def best_lap_times(me, you):
    print("Your lap: ", me)
    print("Enemy play: ", you)

sio.connect('http://localhost:3000')


while True:
    message = input()
    sio.emit('message', message)
