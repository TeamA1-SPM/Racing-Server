package com.racing;

// JavaClient.java
import io.socket.client.IO;
import io.socket.client.Socket;
import io.socket.emitter.Emitter;

import java.net.URISyntaxException;
import java.util.Scanner;

public class JavaClient {
    public static void main(String[] args) {
        try {
            Socket socket = IO.socket("http://localhost:3000");

            socket.on(Socket.EVENT_CONNECT, new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    System.out.println("Connected to server");
                }
            }).on(Socket.EVENT_DISCONNECT, new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    System.out.println("Disconnected from server");
                }
            }).on("message", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    System.out.println("Message received: " + args[0]);
                }
            }).on("best_lap_times", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    System.out.println("Message received: " + args[0]);
                    System.out.println("Message received: " + args[1]);
                }

            });

            socket.connect();

            Scanner scanner = new Scanner(System.in);
            while (true) {
                // System.out.print("Enter a message: ");
                String message = scanner.nextLine();
                socket.emit("message", message);
            }

        } catch (URISyntaxException e) {
            e.printStackTrace();
        }
    }
}
