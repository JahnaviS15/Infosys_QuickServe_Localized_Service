import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapPin, Clock, DollarSign, Star, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserDashboard = ({ user, logout, socket }) => {
  const [activeTab, setActiveTab] = useState('browse');
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    minPrice: '',
    maxPrice: ''
  });
  const [selectedService, setSelectedService] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchServices();
    if (activeTab === 'bookings') {
      fetchBookings();
    }
  }, [activeTab]);

  useEffect(() => {
    if (socket && bookings.length > 0) {
      bookings.forEach(booking => {
        socket.emit('join_booking', { booking_id: booking.id });
      });

      socket.on('booking_status_update', (data) => {
        toast.info(`Booking status updated: ${data.status}`);
        fetchBookings();
      });

      return () => {
        socket.off('booking_status_update');
      };
    }
  }, [socket, bookings]);

  const fetchServices = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.location) params.append('location', filters.location);
      if (filters.minPrice) params.append('min_price', filters.minPrice);
      if (filters.maxPrice) params.append('max_price', filters.maxPrice);

      const response = await axios.get(`${API}/services?${params}`);
      setServices(response.data);
    } catch (error) {
      toast.error('Failed to fetch services');
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings/user/my-bookings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBookings(response.data);
    } catch (error) {
      toast.error('Failed to fetch bookings');
    }
  };

  const handleBookService = async () => {
    if (!bookingDate || !bookingTime) {
      toast.error('Please select date and time');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/bookings`,
        {
          service_id: selectedService.id,
          date: bookingDate,
          time: bookingTime
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      toast.success('Booking created! Proceeding to payment...');
      setShowBookingModal(false);
      
      // Redirect to payment
      handlePayment(response.data.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (bookingId) => {
    setLoading(true);
    try {
      const originUrl = window.location.origin;
      const response = await axios.post(
        `${API}/payments/create-checkout`,
        null,
        {
          params: {
            booking_id: bookingId,
            origin_url: originUrl
          },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      window.location.href = response.data.url;
    } catch (error) {
      toast.error('Failed to create payment session');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${API}/reviews`,
        {
          service_id: selectedBooking.service_id,
          booking_id: selectedBooking.id,
          rating: review.rating,
          comment: review.comment
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      toast.success('Review submitted!');
      setShowReviewModal(false);
      setReview({ rating: 5, comment: '' });
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      accepted: '#3b82f6',
      'en-route': '#8b5cf6',
      started: '#10b981',
      completed: '#22c55e',
      rejected: '#ef4444',
      cancelled: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div className="dashboard" data-testid="user-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-logo">BookTrack - User</div>
        <div className="dashboard-user">
          <span className="user-name" data-testid="user-name">{user.name}</span>
          <button className="logout-button" onClick={logout} data-testid="logout-button">Logout</button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-tabs">
          <button
            className={`tab-button ${activeTab === 'browse' ? 'active' : ''}`}
            onClick={() => setActiveTab('browse')}
            data-testid="tab-browse-services"
          >
            Browse Services
          </button>
          <button
            className={`tab-button ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
            data-testid="tab-my-bookings"
          >
            My Bookings
          </button>
        </div>

        {activeTab === 'browse' && (
          <>
            <div className="filters-section">
              <div className="filters-grid">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    data-testid="filter-category"
                  >
                    <option value="">All Categories</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Painting">Painting</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., New York"
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                    data-testid="filter-location"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Min Price</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                    data-testid="filter-min-price"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Max Price</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                    data-testid="filter-max-price"
                  />
                </div>

                <button className="filter-button" onClick={fetchServices} data-testid="apply-filters-button">
                  Apply Filters
                </button>
              </div>
            </div>

            <div className="services-grid">
              {services.map((service) => (
                <div key={service.id} className="service-card" data-testid={`service-card-${service.id}`}>
                  <img src={service.image_url} alt={service.name} className="service-image" />
                  <div className="service-info">
                    <div className="service-header">
                      <h3 className="service-name">{service.name}</h3>
                      <span className="service-category">{service.category}</span>
                    </div>
                    <p className="service-description">{service.description}</p>
                    <div className="service-details">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin size={16} />
                        <span>{service.location}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={16} />
                        <span>{service.duration} mins</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <DollarSign size={16} />
                        <span>${service.price}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Star size={16} fill="#f59e0b" color="#f59e0b" />
                        <span>{service.average_rating || 0} ({service.review_count || 0})</span>
                      </div>
                    </div>
                    <div className="service-actions">
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setSelectedService(service);
                          setShowBookingModal(true);
                        }}
                        data-testid={`book-now-button-${service.id}`}
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {services.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3 className="empty-title">No services found</h3>
                <p>Try adjusting your filters</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'bookings' && (
          <>
            <div className="services-grid">
              {bookings.map((booking) => (
                <div key={booking.id} className="service-card" data-testid={`booking-card-${booking.id}`}>
                  <div className="service-info">
                    <div className="service-header">
                      <h3 className="service-name">{booking.service_name}</h3>
                      <span
                        className="service-category"
                        style={{ background: getStatusColor(booking.status) }}
                        data-testid={`booking-status-${booking.id}`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <div className="service-details">
                      <div><strong>Provider:</strong> {booking.provider_name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={16} />
                        <span>{booking.date} at {booking.time}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <DollarSign size={16} />
                        <span>${booking.amount}</span>
                      </div>
                      <div><strong>Payment:</strong> {booking.payment_status}</div>
                    </div>
                    {booking.status === 'completed' && booking.payment_status === 'paid' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowReviewModal(true);
                        }}
                        style={{ marginTop: '1rem' }}
                        data-testid={`review-button-${booking.id}`}
                      >
                        Leave Review
                      </button>
                    )}
                    {booking.payment_status === 'pending' && booking.status === 'pending' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => handlePayment(booking.id)}
                        style={{ marginTop: '1rem' }}
                        data-testid={`pay-now-button-${booking.id}`}
                      >
                        Pay Now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {bookings.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <h3 className="empty-title">No bookings yet</h3>
                <p>Start by booking a service</p>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent data-testid="booking-modal">
          <DialogHeader>
            <DialogTitle>Book Service: {selectedService?.name}</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                data-testid="booking-date-input"
              />
            </div>
            <div>
              <Label>Time</Label>
              <Input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                data-testid="booking-time-input"
              />
            </div>
            <div style={{ padding: '1rem', background: '#f5f5f7', borderRadius: '8px' }}>
              <div><strong>Service:</strong> {selectedService?.name}</div>
              <div><strong>Price:</strong> ${selectedService?.price}</div>
              <div><strong>Duration:</strong> {selectedService?.duration} minutes</div>
            </div>
            <Button onClick={handleBookService} disabled={loading} data-testid="confirm-booking-button">
              {loading ? 'Processing...' : 'Confirm & Pay'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent data-testid="review-modal">
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <Label>Rating (1-5)</Label>
              <Select value={review.rating.toString()} onValueChange={(v) => setReview({ ...review, rating: parseInt(v) })}>
                <SelectTrigger data-testid="review-rating-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(num => (
                    <SelectItem key={num} value={num.toString()}>{num} Star{num > 1 ? 's' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Comment</Label>
              <Textarea
                value={review.comment}
                onChange={(e) => setReview({ ...review, comment: e.target.value })}
                placeholder="Share your experience..."
                rows={4}
                data-testid="review-comment-textarea"
              />
            </div>
            <Button onClick={handleSubmitReview} disabled={loading} data-testid="submit-review-button">
              {loading ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDashboard;
