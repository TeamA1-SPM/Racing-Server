# python_client.py
import socketio

sio = socketio.Client()

@sio.event
def connect():
    print('Connected to server')

@sio.event
def disconnect():
    print('Disconnected from server')

sio.connect('http://localhost:3000')

while True:
    message = input('Enter a message: ')
    sio.emit('message', message)
