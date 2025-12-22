package com.booktrack.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("reviews")
public class Review {

    @Id
    private String mongoId;

    private String id;
    private String userId;
    private String userName;
    private String serviceId;
    private String bookingId;
    private int rating;
    private String comment;
    private String createdAt;

    public static Review newReview(User user, String serviceId, String bookingId, int rating, String comment) {
        Review r = new Review();
        r.id = java.util.UUID.randomUUID().toString();
        r.userId = user.getId();
        r.userName = user.getName();
        r.serviceId = serviceId;
        r.bookingId = bookingId;
        r.rating = rating;
        r.comment = comment;
        r.createdAt = Instant.now().toString();
        return r;
    }
}
