package com.booktrack.service;

import com.corundumstudio.socketio.SocketIOServer;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class BookingSocketService {

    private final SocketIOServer server;

    public BookingSocketService(SocketIOServer server) {
        this.server = server;
    }

    public void emitBookingStatusUpdate(String bookingId, String status) {
        Map<String, String> payload = Map.of(
                "booking_id", bookingId,
                "status", status
        );
        server.getBroadcastOperations().sendEvent("booking_status_update", payload);
    }
}
