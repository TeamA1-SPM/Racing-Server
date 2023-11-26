# python_client.py
import socketio

sio = socketio.Client()

def register ():
    data = {
        'username': 'lewin',
        'passwort': '321'
    }
    sio.emit('register', data)

@sio.event
def connect():
    register()
    print('Connected to server')

@sio.event
def disconnect():
    print('Disconnected from server')

@sio.event
def message(message):
    print("Message received: ", message)

sio.connect('http://localhost:3000')


while True:
    message = input()
    sio.emit('message', message)
