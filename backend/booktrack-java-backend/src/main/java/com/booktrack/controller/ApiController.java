package com.booktrack.controller;

import com.booktrack.dto.*;
import com.booktrack.model.*;
import com.booktrack.repository.*;
import com.booktrack.service.BookingSocketService;
import com.booktrack.service.JwtService;
import com.booktrack.service.PasswordService;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ApiController {

    private final UserRepository userRepo;
    private final ServiceRepository serviceRepo;
    private final BookingRepository bookingRepo;
    private final ReviewRepository reviewRepo;
    private final PaymentTransactionRepository paymentRepo;
    private final PasswordService passwordService;
    private final JwtService jwtService;
    private final MongoTemplate mongoTemplate;
    private final BookingSocketService bookingSocketService;

    @Value("${app.stripe.webhook-secret:}")
    private String webhookSecret;

    @GetMapping("/")
    public Map<String, String> root() {
        return Map.of("message", "BookTrack API");
    }

    @PostMapping("/auth/register")
    public Map<String, Object> register(@Valid @RequestBody UserCreateDto body) {
        userRepo.findByEmail(body.getEmail()).ifPresent(u -> {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email already registered");
        });

        String hashed = passwordService.hashPassword(body.getPassword());
        User user = User.newUser(
                body.getEmail(),
                body.getName(),
                body.getRole(),
                body.getPhone(),
                hashed
        );
        userRepo.save(user);

        String token = jwtService.createAccessToken(user);
        user.setPassword(null);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("token", token);
        res.put("user", user);
        return res;
    }

    @PostMapping("/auth/login")
    public Map<String, Object> login(@Valid @RequestBody UserLoginDto body) {
        User user = userRepo.findByEmail(body.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordService.matches(body.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        if (user.isBlocked()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account blocked");
        }

        String token = jwtService.createAccessToken(user);
        user.setPassword(null);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("token", token);
        res.put("user", user);
        return res;
    }

    @GetMapping("/auth/me")
    public User getMe(@RequestHeader("Authorization") String authHeader) {
        User u = jwtService.getCurrentUser(authHeader);
        u.setPassword(null);
        return u;
    }

    @PostMapping("/services")
    public Service createService(
            @Valid @RequestBody ServiceCreateDto body,
            @RequestHeader("Authorization") String authHeader
    ) {
        User current = jwtService.getCurrentUser(authHeader);
        if (!"provider".equals(current.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only providers can create services");
        }

        Service service = Service.newService(
                current,
                body.getName(),
                body.getDescription(),
                body.getCategory(),
                body.getPrice(),
                body.getLocation(),
                body.getDuration(),
                body.getImageUrl()
        );

        return serviceRepo.save(service);
    }

    @GetMapping("/services")
    public List<Map<String, Object>> getServices(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Double min_price,
            @RequestParam(required = false) Double max_price
    ) {
        Query q = new Query();
        List<Criteria> criteria = new ArrayList<>();

        if (category != null) {
            criteria.add(Criteria.where("category").is(category));
        }
        if (location != null) {
            criteria.add(Criteria.where("location").regex(location, "i"));
        }
        if (min_price != null || max_price != null) {
            Criteria priceCriteria = Criteria.where("price");
            if (min_price != null && max_price != null) {
                priceCriteria.gte(min_price).lte(max_price);
            } else if (min_price != null) {
                priceCriteria.gte(min_price);
            } else {
                priceCriteria.lte(max_price);
            }
            criteria.add(priceCriteria);
        }

        if (!criteria.isEmpty()) {
            q.addCriteria(new Criteria().andOperator(criteria.toArray(new Criteria[0])));
        }

        List<Service> services = mongoTemplate.find(q, Service.class);

        return services.stream().map(s -> {
            List<Review> reviews = reviewRepo.findByServiceId(s.getId());
            double avg = 0.0;
            int count = reviews.size();
            if (count > 0) {
                avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0);
            }
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("provider_id", s.getProviderId());
            m.put("provider_name", s.getProviderName());
            m.put("name", s.getName());
            m.put("description", s.getDescription());
            m.put("category", s.getCategory());
            m.put("price", s.getPrice());
            m.put("location", s.getLocation());
            m.put("duration", s.getDuration());
            m.put("image_url", s.getImageUrl());
            m.put("created_at", s.getCreatedAt());
            m.put("average_rating", count == 0 ? 0 : Math.round(avg * 10.0) / 10.0);
            m.put("review_count", count);
            return m;
        }).collect(Collectors.toList());
    }

    @GetMapping("/services/{service_id}")
    public Map<String, Object> getService(@PathVariable("service_id") String serviceId) {
        Service service = serviceRepo.findById(serviceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service not found"));

        List<Review> reviews = reviewRepo.findByServiceIdOrderByCreatedAtDesc(serviceId);
        double avg = 0.0;
        int count = reviews.size();
        if (count > 0) {
            avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0);
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", service.getId());
        res.put("provider_id", service.getProviderId());
        res.put("provider_name", service.getProviderName());
        res.put("name", service.getName());
        res.put("description", service.getDescription());
        res.put("category", service.getCategory());
        res.put("price", service.getPrice());
        res.put("location", service.getLocation());
        res.put("duration", service.getDuration());
        res.put("image_url", service.getImageUrl());
        res.put("created_at", service.getCreatedAt());
        res.put("reviews", reviews);
        res.put("average_rating", count == 0 ? 0 : Math.round(avg * 10.0) / 10.0);
        res.put("review_count", count);
        return res;
    }

    @GetMapping("/services/provider/my-services")
    public List<Map<String, Object>> getMyServices(
            @RequestHeader("Authorization") String authHeader
    ) {
        User current = jwtService.getCurrentUser(authHeader);
        if (!"provider".equals(current.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only providers can access this");
        }

        List<Service> services = serviceRepo.findByProviderId(current.getId());
        return services.stream().map(s -> {
            List<Review> reviews = reviewRepo.findByServiceId(s.getId());
            double avg = 0.0;
            int count = reviews.size();
            if (count > 0) {
                avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0);
            }
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("provider_id", s.getProviderId());
            m.put("provider_name", s.getProviderName());
            m.put("name", s.getName());
            m.put("description", s.getDescription());
            m.put("category", s.getCategory());
            m.put("price", s.getPrice());
            m.put("location", s.getLocation());
            m.put("duration", s.getDuration());
            m.put("image_url", s.getImageUrl());
            m.put("created_at", s.getCreatedAt());
            m.put("average_rating", count == 0 ? 0 : Math.round(avg * 10.0) / 10.0);
            m.put("review_count", count);
            return m;
        }).collect(Collectors.toList());
    }

    @PutMapping("/services/{service_id}")
    public Service updateService(
            @PathVariable("service_id") String serviceId,
            @RequestBody ServiceUpdateDto body,
            @RequestHeader("Authorization") String authHeader
    ) {
        User current = jwtService.getCurrentUser(authHeader);
        if (!"provider".equals(current.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only providers can update services");
        }

        Service service = serviceRepo.findById(serviceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service not found"));

        if (!service.getProviderId().equals(current.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized");
        }

        if (body.getName() != null) service.setName(body.getName());
        if (body.getDescription() != null) service.setDescription(body.getDescription());
        if (body.getCategory() != null) service.setCategory(body.getCategory());
        if (body.getPrice() != null) service.setPrice(body.getPrice());
        if (body.getLocation() != null) service.setLocation(body.getLocation());
        if (body.getDuration() != null) service.setDuration(body.getDuration());
        if (body.getImageUrl() != null) service.setImageUrl(body.getImageUrl());

        return serviceRepo.save(service);
    }

    @DeleteMapping("/services/{service_id}")
    public Map<String, String> deleteService(
            @PathVariable("service_id") String serviceId,
            @RequestHeader("Authorization") String authHeader
    ) {
        User current = jwtService.getCurrentUser(authHeader);
        if (!"provider".equals(current.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only providers can delete services");
        }

        Service service = serviceRepo.findById(serviceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service not found"));

        if (!service.getProviderId().equals(current.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized");
        }

        serviceRepo.delete(service);
        return Map.of("message", "Service deleted");
    }

    @PostMapping("/bookings")
    public Booking createBooking(
            @Valid @RequestBody BookingCreateDto body,
            @RequestHeader("Authorization") String authHeader
    ) {
        User current = jwtService.getCurrentUser(authHeader);
        if (!"user".equals(current.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only users can create bookings");
        }

        Service service = serviceRepo.findById(body.getServiceId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service not found"));

        Booking booking = Booking.newBooking(current, service, body.getDate(), body.getTime());
        return bookingRepo.save(booking);
    }

    @GetMapping("/bookings/user/my-bookings")
    public List<Booking> getMyBookings(
            @RequestHeader("Authorization") String authHeader
    ) {
        User current = jwtService.getCurrentUser(authHeader);
        if (!"user".equals(current.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only users can access this");
        }

        return bookingRepo.findByUserIdOrderByCreatedAtDesc(current.getId());
    }

    @GetMapping("/bookings/provider/requests")
    public List<Booking> getProviderBookings(
            @RequestHeader("Authorization") String authHeader
    ) {
        User current = jwtService.getCurrentUser(authHeader);
        if (!"provider".equals(current.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only providers can access this");
        }

        return bookingRepo.findByProviderIdOrderByCreatedAtDesc(current.getId());
    }

    @PutMapping("/bookings/{booking_id}/status")
    public Booking updateBookingStatus(
            @PathVariable("booking_id") String bookingId,
            @Valid @RequestBody BookingStatusUpdateDto body,
            @RequestHeader("Authorization") String authHeader
    ) {
        User current = jwtService.getCurrentUser(authHeader);

        Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        if ("provider".equals(current.getRole())) {
            if (!booking.getProviderId().equals(current.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized");
            }
        } else if ("user".equals(current.getRole())) {
            if (!booking.getUserId().equals(current.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized");
            }
            if (!"cancelled".equals(body.getStatus())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Users can only cancel bookings");
            }
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized");
        }

        booking.setStatus(body.getStatus());
        bookingRepo.save(booking);

        bookingSocketService.emitBookingStatusUpdate(booking.getId(), booking.getStatus());

        return booking;
    }

    @GetMapping("/bookings/{booking_id}")
    public Booking getBooking(
            @PathVariable("booking_id") String bookingId,
            @RequestHeader("Authorization") String authHeader
    ) {
        User current = jwtService.getCurrentUser(authHeader);
        Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        if ("user".equals(current.getRole()) && !booking.getUserId().equals(current.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized");
        }
        if ("provider".equals(current.getRole()) && !booking.getProviderId().equals(current.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized");
        }

        return booking;
    }

    @PostMapping("/reviews")
    public Review createReview(
            @Valid @RequestBody ReviewCreateDto body,
            @RequestHeader("Authorization") String authHeader
    ) {
        User current = jwtService.getCurrentUser(authHeader);
        if (!"user".equals(current.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only users can create reviews");
        }

        Booking booking = bookingRepo.findById(body.getBookingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        if (!booking.getUserId().equals(current.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized");
        }
        if (!"completed".equals(booking.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Can only review completed bookings");
        }

        reviewRepo.findByBookingId(body.getBookingId())
                .ifPresent(r -> {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Already reviewed");
                });

        Review review = Review.newReview(
                current,
                body.getServiceId(),
                body.getBookingId(),
                body.getRating(),
                body.getComment()
        );
        return reviewRepo.save(review);
    }

    @GetMapping("/reviews/service/{service_id}")
    public List<Review> getServiceReviews(@PathVariable("service_id") String serviceId) {
        return reviewRepo.findByServiceIdOrderByCreatedAtDesc(serviceId);
    }

    @PostMapping("/payments/create-checkout")
    public Map<String, String> createCheckout(
            @RequestParam("booking_id") String bookingId,
            @RequestParam("origin_url") String originUrl,
            @RequestHeader("Authorization") String authHeader
    ) {
        User current = jwtService.getCurrentUser(authHeader);

        Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        if (!booking.getUserId().equals(current.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized");
        }
        if ("paid".equalsIgnoreCase(booking.getPaymentStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Already paid");
        }

        try {
            long amountInCents = Math.round(booking.getAmount() * 100);

            SessionCreateParams params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(originUrl + "/payment-success?session_id={CHECKOUT_SESSION_ID}")
                    .setCancelUrl(originUrl + "/payment-cancelled")
                    .addLineItem(
                            SessionCreateParams.LineItem.builder()
                                    .setQuantity(1L)
                                    .setPriceData(
                                            SessionCreateParams.LineItem.PriceData.builder()
                                                    .setCurrency("usd")
                                                    .setUnitAmount(amountInCents)
                                                    .setProductData(
                                                            SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                                                    .setName(booking.getServiceName())
                                                                    .setDescription("Booking for " + booking.getDate() + " " + booking.getTime())
                                                                    .build()
                                                    )
                                                    .build()
                                    )
                                    .build()
                    )
                    .putMetadata("booking_id", booking.getId())
                    .putMetadata("user_id", current.getId())
                    .build();

            Session session = Session.create(params);

            PaymentTransaction tx = PaymentTransaction.pending(
                    session.getId(),
                    booking,
                    current.getId(),
                    session.getCurrency(),
                    Map.of(
                            "booking_id", booking.getId(),
                            "user_id", current.getId()
                    )
            );
            paymentRepo.save(tx);

            return Map.of(
                    "url", session.getUrl(),
                    "session_id", session.getId()
            );
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Stripe error: " + e.getMessage());
        }
    }

    @GetMapping("/payments/checkout-status/{session_id}")
    public Map<String, Object> getCheckoutStatus(
            @PathVariable("session_id") String sessionId,
            @RequestHeader("Authorization") String authHeader
    ) {
        User current = jwtService.getCurrentUser(authHeader);

        PaymentTransaction tx = paymentRepo.findBySessionId(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));

        if (!tx.getUserId().equals(current.getId()) && !"admin".equals(current.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized");
        }

        try {
            Session session = Session.retrieve(sessionId);

            if ("complete".equalsIgnoreCase(session.getStatus())
                    && "paid".equalsIgnoreCase(session.getPaymentStatus())
                    && !"paid".equalsIgnoreCase(tx.getPaymentStatus())) {

                tx.setPaymentStatus("paid");
                paymentRepo.save(tx);

                Booking booking = bookingRepo.findById(tx.getBookingId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

                booking.setPaymentStatus("paid");
                bookingRepo.save(booking);
            }

            Map<String, Object> res = new LinkedHashMap<>();
            res.put("status", session.getStatus());
            res.put("payment_status", session.getPaymentStatus());
            res.put("booking_id", tx.getBookingId());
            return res;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Stripe error: " + e.getMessage());
        }
    }

    @PostMapping("/webhook/stripe")
    public Map<String, String> stripeWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader
    ) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            return Map.of("status", "ignored");
        }

        try {
            Event event = Webhook.constructEvent(payload, sigHeader, webhookSecret);

            if ("checkout.session.completed".equals(event.getType())) {
                Session session = (Session) event.getDataObjectDeserializer()
                        .getObject()
                        .orElse(null);

                if (session != null) {
                    String sessionId = session.getId();

                    PaymentTransaction tx = paymentRepo.findBySessionId(sessionId)
                            .orElse(null);

                    if (tx != null) {
                        tx.setPaymentStatus("paid");
                        paymentRepo.save(tx);

                        Booking booking = bookingRepo.findById(tx.getBookingId())
                                .orElse(null);
                        if (booking != null) {
                            booking.setPaymentStatus("paid");
                            bookingRepo.save(booking);
                        }
                    }
                }
            }

            return Map.of("status", "success");
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Webhook error: " + e.getMessage());
        }
    }

    @GetMapping("/admin/stats")
    public Map<String, Object> getAdminStats(
            @RequestHeader("Authorization") String authHeader
    ) {
        User current = jwtService.getCurrentUser(authHeader);
        if (!"admin".equals(current.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }

        long totalUsers = userRepo.countByRole("user");
        long totalProviders = userRepo.countByRole("provider");
        long totalServices = serviceRepo.count();
        long totalBookings = bookingRepo.count();

        List<Booking> bookings = bookingRepo.findAll();
        Map<String, Long> counts = bookings.stream()
                .collect(Collectors.groupingBy(Booking::getServiceId, Collectors.counting()));

        List<Map<String, Object>> topServices = counts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("_id", e.getKey());
                    m.put("count", e.getValue());
                    serviceRepo.findById(e.getKey()).ifPresent(s -> m.put("service", s));
                    return m;
                })
                .collect(Collectors.toList());

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("total_users", totalUsers);
        res.put("total_providers", totalProviders);
        res.put("total_services", totalServices);
        res.put("total_bookings", totalBookings);
        res.put("top_services", topServices);
        return res;
    }

    @GetMapping("/admin/users")
    public List<User> getAllUsers(@RequestHeader("Authorization") String authHeader) {
        User current = jwtService.getCurrentUser(authHeader);
        if (!"admin".equals(current.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }

        List<User> users = userRepo.findAll();
        users.forEach(u -> u.setPassword(null));
        return users;
    }

    @PutMapping("/admin/users/{user_id}/block")
    public Map<String, String> blockUser(
            @PathVariable("user_id") String userId,
            @RequestParam("block") boolean block,
            @RequestHeader("Authorization") String authHeader
    ) {
        User current = jwtService.getCurrentUser(authHeader);
        if (!"admin".equals(current.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        user.setBlocked(block);
        userRepo.save(user);
        return Map.of("message", "User updated");
    }

    @DeleteMapping("/admin/users/{user_id}")
    public Map<String, String> deleteUser(
            @PathVariable("user_id") String userId,
            @RequestHeader("Authorization") String authHeader
    ) {
        User current = jwtService.getCurrentUser(authHeader);
        if (!"admin".equals(current.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        userRepo.delete(user);
        return Map.of("message", "User deleted");
    }

    @GetMapping("/admin/bookings")
    public List<Booking> getAllBookings(
            @RequestHeader("Authorization") String authHeader
    ) {
        User current = jwtService.getCurrentUser(authHeader);
        if (!"admin".equals(current.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }

        Query q = new Query().with(Sort.by(Sort.Direction.DESC, "createdAt"));
        return mongoTemplate.find(q, Booking.class);
    }
}
