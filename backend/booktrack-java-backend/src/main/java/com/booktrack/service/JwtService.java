package com.booktrack.service;

import com.booktrack.model.User;
import com.booktrack.repository.UserRepository;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

import static org.springframework.http.HttpStatus.*;

@Service
public class JwtService {

    private final byte[] secretBytes;
    private final long expirationMillis;
    private final UserRepository userRepository;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-minutes}") long expMinutes,
            UserRepository userRepository
    ) {
        this.secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.expirationMillis = expMinutes * 60_000L;
        this.userRepository = userRepository;
    }

    public String createAccessToken(User user) {
        Instant now = Instant.now();
        Instant exp = now.plusMillis(expirationMillis);

        return Jwts.builder()
                .setSubject(user.getId())
                .addClaims(Map.of("role", user.getRole()))
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(exp))
                .signWith(Keys.hmacShaKeyFor(secretBytes), SignatureAlgorithm.HS256)
                .compact();
    }

    public User getCurrentUser(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(UNAUTHORIZED, "Missing token");
        }
        String token = authorizationHeader.substring(7);
        try {
            Jws<Claims> jws = Jwts.parserBuilder()
                    .setSigningKey(Keys.hmacShaKeyFor(secretBytes))
                    .build()
                    .parseClaimsJws(token);

            String userId = jws.getBody().getSubject();
            if (userId == null) {
                throw new ResponseStatusException(UNAUTHORIZED, "Invalid token");
            }

            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "User not found"));

            if (user.isBlocked()) {
                throw new ResponseStatusException(FORBIDDEN, "Account blocked");
            }

            return user;
        } catch (JwtException ex) {
            throw new ResponseStatusException(UNAUTHORIZED, "Invalid token");
        }
    }
}
