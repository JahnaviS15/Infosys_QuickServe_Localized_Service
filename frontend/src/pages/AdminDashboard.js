import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Briefcase, ShoppingBag, Calendar, Ban, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = ({ user, logout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    fetchStats();
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'bookings') {
      fetchBookings();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch stats');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/admin/bookings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBookings(response.data);
    } catch (error) {
      toast.error('Failed to fetch bookings');
    }
  };

  const handleBlockUser = async (userId, block) => {
    try {
      await axios.put(
        `${API}/admin/users/${userId}/block`,
        null,
        {
          params: { block },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      toast.success(`User ${block ? 'blocked' : 'unblocked'}`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await axios.delete(`${API}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('User deleted');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  return (
    <div className="dashboard" data-testid="admin-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-logo">BookTrack - Admin</div>
        <div className="dashboard-user">
          <span className="user-name" data-testid="admin-name">{user.name}</span>
          <button className="logout-button" onClick={logout} data-testid="logout-button">Logout</button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-tabs">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            data-testid="tab-overview"
          >
            Overview
          </button>
          <button
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
            data-testid="tab-users"
          >
            Users
          </button>
          <button
            className={`tab-button ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
            data-testid="tab-bookings"
          >
            Bookings
          </button>
        </div>

        {activeTab === 'overview' && stats && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }} data-testid="stat-total-users">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    <Users size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1d1d1f' }}>{stats.total_users}</div>
                    <div style={{ color: '#86868b', fontSize: '0.875rem' }}>Total Users</div>
                  </div>
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }} data-testid="stat-total-providers">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1d1d1f' }}>{stats.total_providers}</div>
                    <div style={{ color: '#86868b', fontSize: '0.875rem' }}>Service Providers</div>
                  </div>
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }} data-testid="stat-total-services">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1d1d1f' }}>{stats.total_services}</div>
                    <div style={{ color: '#86868b', fontSize: '0.875rem' }}>Total Services</div>
                  </div>
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }} data-testid="stat-total-bookings">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    <Calendar size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1d1d1f' }}>{stats.total_bookings}</div>
                    <div style={{ color: '#86868b', fontSize: '0.875rem' }}>Total Bookings</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>Top Services</h2>
              {stats.top_services.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {stats.top_services.map((item) => (
                    <div
                      key={item._id}
                      style={{
                        padding: '1rem',
                        background: '#f5f5f7',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                          {item.service?.name || 'Unknown Service'}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#86868b' }}>
                          {item.service?.category}
                        </div>
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        fontWeight: '600'
                      }}>
                        {item.count} bookings
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#86868b' }}>No bookings yet</p>
              )}
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>All Users</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e5e7' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Name</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Email</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Role</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #e5e5e7' }} data-testid={`user-row-${u.id}`}>
                      <td style={{ padding: '1rem' }}>{u.name}</td>
                      <td style={{ padding: '1rem' }}>{u.email}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: u.blocked ? '#ef4444' : '#22c55e',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          {u.blocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleBlockUser(u.id, !u.blocked)}
                            style={{
                              padding: '0.5rem 1rem',
                              background: u.blocked ? '#22c55e' : '#f59e0b',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                            data-testid={`block-user-button-${u.id}`}
                          >
                            <Ban size={16} />
                            {u.blocked ? 'Unblock' : 'Block'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                            data-testid={`delete-user-button-${u.id}`}
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>All Bookings</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e5e7' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Service</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>User</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Provider</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Date</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Amount</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} style={{ borderBottom: '1px solid #e5e5e7' }} data-testid={`booking-row-${booking.id}`}>
                      <td style={{ padding: '1rem' }}>{booking.service_name}</td>
                      <td style={{ padding: '1rem' }}>{booking.user_name}</td>
                      <td style={{ padding: '1rem' }}>{booking.provider_name}</td>
                      <td style={{ padding: '1rem' }}>{booking.date}</td>
                      <td style={{ padding: '1rem' }}>₹{booking.amount}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: '#667eea',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
