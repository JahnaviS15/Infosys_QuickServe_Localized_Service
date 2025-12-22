package com.booktrack.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("users")
public class User {

    @Id
    private String mongoId;

    private String id;
    private String email;
    private String name;
    private String role;
    private String phone;
    private boolean blocked = false;
    private String password;
    private String createdAt;

    public static User newUser(String email, String name, String role, String phone, String hashedPassword) {
        User u = new User();
        u.id = java.util.UUID.randomUUID().toString();
        u.email = email;
        u.name = name;
        u.role = role;
        u.phone = phone;
        u.blocked = false;
        u.password = hashedPassword;
        u.createdAt = Instant.now().toString();
        return u;
    }
}
