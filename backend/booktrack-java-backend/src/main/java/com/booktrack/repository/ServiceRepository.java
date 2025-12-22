package com.booktrack.repository;

import com.booktrack.model.Service;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ServiceRepository extends MongoRepository<Service, String> {
    List<Service> findByProviderId(String providerId);
    Optional<Service> findById(String id);
}
