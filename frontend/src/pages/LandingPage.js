import React, { useState } from 'react';
import axios from 'axios';
import { User, Briefcase, Shield } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LandingPage = ({ onLogin }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);

  const roles = [
    {
      id: 'user',
      name: 'User',
      icon: <User size={40} />,
      description: 'Book services'
    },
    {
      id: 'provider',
      name: 'Provider',
      icon: <Briefcase size={40} />,
      description: 'Offer services'
    },
    {
      id: 'admin',
      name: 'Admin',
      icon: <Shield size={40} />,
      description: 'Manage platform'
    }
  ];

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setShowAuth(true);
    setFormData({ ...formData });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : { ...formData, role: selectedRole };

      const response = await axios.post(`${API}${endpoint}`, payload);
      
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
      onLogin(response.data.token, response.data.user);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="landing-page" data-testid="landing-page">
      <div className="landing-content">
        <div className="landing-header">
          <h1 className="landing-title" data-testid="landing-title">BookTrack</h1>
          <p className="landing-subtitle">Your trusted platform for booking local services with real-time tracking</p>
        </div>

        <div className="role-cards">
          {roles.map((role) => (
            <div
              key={role.id}
              className="role-card"
              onClick={() => handleRoleSelect(role.id)}
              data-testid={`role-card-${role.id}`}
            >
              <div className="role-icon">{role.icon}</div>
              <h2 className="role-name">{role.name}</h2>
              <p className="role-description">{role.description}</p>
            </div>
          ))}
        </div>
      </div>

      {showAuth && (
        <div className="auth-overlay" onClick={() => setShowAuth(false)} data-testid="auth-overlay">
          <div className="auth-modal" onClick={(e) => e.stopPropagation()} data-testid="auth-modal">
            <button className="close-button" onClick={() => setShowAuth(false)} data-testid="auth-close-button">
              ×
            </button>

            <div className="auth-header">
              <h2 className="auth-title" data-testid="auth-title">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="auth-subtitle">
                {isLogin ? 'Sign in to continue' : `Register as ${selectedRole}`}
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} data-testid="auth-form">
              {!isLogin && (
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    data-testid="auth-name-input"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  data-testid="auth-email-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  data-testid="auth-password-input"
                />
              </div>

              {!isLogin && (
                <div className="form-group">
                  <label className="form-label">Phone (Optional)</label>
                  <input
                    type="tel"
                    name="phone"
                    className="form-input"
                    value={formData.phone}
                    onChange={handleChange}
                    data-testid="auth-phone-input"
                  />
                </div>
              )}

              <button
                type="submit"
                className="auth-button"
                disabled={loading}
                data-testid="auth-submit-button"
              >
                {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>

              <div className="auth-toggle">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <span className="auth-link" onClick={() => setIsLogin(!isLogin)} data-testid="auth-toggle-link">
                  {isLogin ? 'Sign up' : 'Sign in'}
                </span>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
