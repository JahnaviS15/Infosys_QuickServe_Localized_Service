package com.booktrack.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Data
@Document("payment_transactions")
public class PaymentTransaction {

    @Id
    private String mongoId;

    private String id;
    private String sessionId;
    private String bookingId;
    private String userId;
    private double amount;
    private String currency;
    private String paymentStatus;
    private Map<String, Object> metadata;
    private String createdAt;

    public static PaymentTransaction pending(
            String sessionId,
            Booking booking,
            String userId,
            String currency,
            Map<String, Object> metadata
    ) {
        PaymentTransaction t = new PaymentTransaction();
        t.id = java.util.UUID.randomUUID().toString();
        t.sessionId = sessionId;
        t.bookingId = booking.getId();
        t.userId = userId;
        t.amount = booking.getAmount();
        t.currency = currency;
        t.paymentStatus = "pending";
        t.metadata = metadata;
        t.createdAt = Instant.now().toString();
        return t;
    }
}
