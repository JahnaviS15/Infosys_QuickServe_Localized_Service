package com.booktrack.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("services")
public class Service {

    @Id
    private String mongoId;

    private String id;
    private String providerId;
    private String providerName;
    private String name;
    private String description;
    private String category;
    private double price;
    private String location;
    private int duration;
    private String imageUrl;
    private String createdAt;

    public static Service newService(
            User provider,
            String name,
            String description,
            String category,
            double price,
            String location,
            int duration,
            String imageUrl
    ) {
        Service s = new Service();
        s.id = java.util.UUID.randomUUID().toString();
        s.providerId = provider.getId();
        s.providerName = provider.getName();
        s.name = name;
        s.description = description;
        s.category = category;
        s.price = price;
        s.location = location;
        s.duration = duration;
        s.imageUrl = imageUrl;
        s.createdAt = Instant.now().toString();
        return s;
    }
}
