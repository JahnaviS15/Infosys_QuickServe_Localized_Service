package com.booktrack.repository;

import com.booktrack.model.Booking;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface BookingRepository extends MongoRepository<Booking, String> {
    List<Booking> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Booking> findByProviderIdOrderByCreatedAtDesc(String providerId);
    Optional<Booking> findById(String id);
}
