package com.booktrack.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("bookings")
public class Booking {

    @Id
    private String mongoId;

    private String id;
    private String userId;
    private String userName;
    private String serviceId;
    private String serviceName;
    private String providerId;
    private String providerName;
    private String date;
    private String time;
    private String status;
    private String paymentStatus;
    private double amount;
    private String createdAt;

    public static Booking newBooking(User user, Service service, String date, String time) {
        Booking b = new Booking();
        b.id = java.util.UUID.randomUUID().toString();
        b.userId = user.getId();
        b.userName = user.getName();
        b.serviceId = service.getId();
        b.serviceName = service.getName();
        b.providerId = service.getProviderId();
        b.providerName = service.getProviderName();
        b.date = date;
        b.time = time;
        b.status = "pending";
        b.paymentStatus = "pending";
        b.amount = service.getPrice();
        b.createdAt = Instant.now().toString();
        return b;
    }
}
