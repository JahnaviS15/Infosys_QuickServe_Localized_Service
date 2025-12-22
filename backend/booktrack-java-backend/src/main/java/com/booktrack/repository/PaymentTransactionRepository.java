package com.booktrack.repository;

import com.booktrack.model.PaymentTransaction;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface PaymentTransactionRepository extends MongoRepository<PaymentTransaction, String> {
    Optional<PaymentTransaction> findBySessionId(String sessionId);
}
