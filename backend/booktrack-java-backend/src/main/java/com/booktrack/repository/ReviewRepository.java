package com.booktrack.repository;

import com.booktrack.model.Review;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findByServiceIdOrderByCreatedAtDesc(String serviceId);
    List<Review> findByServiceId(String serviceId);
    Optional<Review> findByBookingId(String bookingId);
}
