from flask import current_app
from flask_socketio import SocketIO


def register_socket_events(socketio: SocketIO):
    @socketio.on("connect")
    def client_connected():
        current_app.logger.info("socket client_connected")
        socketio.emit("client_connected", {"message": "connected"})

    @socketio.on("disconnect")
    def client_disconnected():
        current_app.logger.info("socket client_disconnected")
