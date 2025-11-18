import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, MapPin, Clock, DollarSign, Star, Calendar, Edit, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProviderDashboard = ({ user, logout, socket }) => {
  const [activeTab, setActiveTab] = useState('services');
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    category: 'Cleaning',
    price: '',
    location: '',
    duration: '',
    image_url: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'services') {
      fetchServices();
    } else {
      fetchBookings();
    }
  }, [activeTab]);

  useEffect(() => {
    if (socket && bookings.length > 0) {
      bookings.forEach(booking => {
        socket.emit('join_booking', { booking_id: booking.id });
      });
    }
  }, [socket, bookings]);

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API}/services/provider/my-services`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setServices(response.data);
    } catch (error) {
      toast.error('Failed to fetch services');
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings/provider/requests`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBookings(response.data);
    } catch (error) {
      toast.error('Failed to fetch bookings');
    }
  };

  const handleServiceSubmit = async () => {
    setLoading(true);
    try {
      if (editingService) {
        await axios.put(
          `${API}/services/${editingService.id}`,
          serviceForm,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        toast.success('Service updated successfully');
      } else {
        await axios.post(
          `${API}/services`,
          serviceForm,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        toast.success('Service created successfully');
      }
      
      setShowServiceModal(false);
      setEditingService(null);
      resetForm();
      fetchServices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save service');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;

    try {
      await axios.delete(`${API}/services/${serviceId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Service deleted');
      fetchServices();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description,
      category: service.category,
      price: service.price.toString(),
      location: service.location,
      duration: service.duration.toString(),
      image_url: service.image_url
    });
    setShowServiceModal(true);
  };

  const handleUpdateBookingStatus = async (bookingId, status) => {
    try {
      await axios.put(
        `${API}/bookings/${bookingId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success(`Booking ${status}`);
      fetchBookings();
    } catch (error) {
      toast.error('Failed to update booking status');
    }
  };

  const resetForm = () => {
    setServiceForm({
      name: '',
      description: '',
      category: 'Cleaning',
      price: '',
      location: '',
      duration: '',
      image_url: ''
    });
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
    <div className="dashboard" data-testid="provider-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-logo">BookTrack - Provider</div>
        <div className="dashboard-user">
          <span className="user-name" data-testid="provider-name">{user.name}</span>
          <button className="logout-button" onClick={logout} data-testid="logout-button">Logout</button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-tabs">
          <button
            className={`tab-button ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
            data-testid="tab-my-services"
          >
            My Services
          </button>
          <button
            className={`tab-button ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
            data-testid="tab-bookings"
          >
            Bookings
          </button>
        </div>

        {activeTab === 'services' && (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  resetForm();
                  setEditingService(null);
                  setShowServiceModal(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                data-testid="add-new-service-button"
              >
                <Plus size={20} />
                Add New Service
              </button>
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
                        className="btn btn-secondary"
                        onClick={() => handleEditService(service)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
                        data-testid={`edit-service-button-${service.id}`}
                      >
                        <Edit size={16} />
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteService(service.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
                        data-testid={`delete-service-button-${service.id}`}
                      >
                        <Trash size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {services.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">💼</div>
                <h3 className="empty-title">No services yet</h3>
                <p>Add your first service to get started</p>
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
                      <div><strong>Customer:</strong> {booking.user_name}</div>
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
                    
                    {booking.status === 'pending' && (
                      <div className="service-actions" style={{ marginTop: '1rem' }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleUpdateBookingStatus(booking.id, 'accepted')}
                          data-testid={`accept-booking-button-${booking.id}`}
                        >
                          Accept
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleUpdateBookingStatus(booking.id, 'rejected')}
                          data-testid={`reject-booking-button-${booking.id}`}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    
                    {booking.status === 'accepted' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleUpdateBookingStatus(booking.id, 'en-route')}
                        style={{ marginTop: '1rem' }}
                        data-testid={`en-route-button-${booking.id}`}
                      >
                        Start Journey (En-route)
                      </button>
                    )}
                    
                    {booking.status === 'en-route' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleUpdateBookingStatus(booking.id, 'started')}
                        style={{ marginTop: '1rem' }}
                        data-testid={`start-service-button-${booking.id}`}
                      >
                        Start Service
                      </button>
                    )}
                    
                    {booking.status === 'started' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                        style={{ marginTop: '1rem' }}
                        data-testid={`complete-service-button-${booking.id}`}
                      >
                        Mark as Completed
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
                <p>Bookings will appear here when customers book your services</p>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={showServiceModal} onOpenChange={setShowServiceModal}>
        <DialogContent data-testid="service-modal">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
            <div>
              <Label>Service Name</Label>
              <Input
                value={serviceForm.name}
                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                placeholder="e.g., Home Cleaning"
                data-testid="service-name-input"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={serviceForm.description}
                onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                placeholder="Describe your service..."
                rows={3}
                data-testid="service-description-input"
              />
            </div>
            
            <div>
              <Label>Category</Label>
              <Select value={serviceForm.category} onValueChange={(v) => setServiceForm({ ...serviceForm, category: v })}>
                <SelectTrigger data-testid="service-category-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cleaning">Cleaning</SelectItem>
                  <SelectItem value="Plumbing">Plumbing</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                  <SelectItem value="Painting">Painting</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Price ($)</Label>
              <Input
                type="number"
                value={serviceForm.price}
                onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                placeholder="50"
                data-testid="service-price-input"
              />
            </div>
            
            <div>
              <Label>Location</Label>
              <Input
                value={serviceForm.location}
                onChange={(e) => setServiceForm({ ...serviceForm, location: e.target.value })}
                placeholder="e.g., New York, NY"
                data-testid="service-location-input"
              />
            </div>
            
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={serviceForm.duration}
                onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })}
                placeholder="120"
                data-testid="service-duration-input"
              />
            </div>
            
            <div>
              <Label>Image URL</Label>
              <Input
                value={serviceForm.image_url}
                onChange={(e) => setServiceForm({ ...serviceForm, image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
                data-testid="service-image-url-input"
              />
            </div>
            
            <Button onClick={handleServiceSubmit} disabled={loading} data-testid="save-service-button">
              {loading ? 'Saving...' : (editingService ? 'Update Service' : 'Create Service')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProviderDashboard;
