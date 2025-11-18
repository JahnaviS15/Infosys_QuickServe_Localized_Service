import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import '@/App.css';

import LandingPage from '@/pages/LandingPage';
import UserDashboard from '@/pages/UserDashboard';
import ProviderDashboard from '@/pages/ProviderDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import PaymentSuccess from '@/pages/PaymentSuccess';
import PaymentCancel from '@/pages/PaymentCancel';
import { Toaster } from '@/components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (token) {
      fetchUser();
      
      // Initialize Socket.IO
      const newSocket = io(BACKEND_URL, {
        transports: ['websocket', 'polling']
      });
      setSocket(newSocket);
      
      return () => newSocket.close();
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    }
  };

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    if (socket) socket.close();
  };

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            !user ? <LandingPage onLogin={login} /> : 
            user.role === 'user' ? <Navigate to="/user" /> :
            user.role === 'provider' ? <Navigate to="/provider" /> :
            <Navigate to="/admin" />
          } />
          
          <Route path="/user" element={
            user && user.role === 'user' ? 
            <UserDashboard user={user} logout={logout} socket={socket} /> : 
            <Navigate to="/" />
          } />
          
          <Route path="/provider" element={
            user && user.role === 'provider' ? 
            <ProviderDashboard user={user} logout={logout} socket={socket} /> : 
            <Navigate to="/" />
          } />
          
          <Route path="/admin" element={
            user && user.role === 'admin' ? 
            <AdminDashboard user={user} logout={logout} /> : 
            <Navigate to="/" />
          } />
          
          <Route path="/payment-success" element={<PaymentSuccess user={user} />} />
          <Route path="/payment-cancel" element={<PaymentCancel />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
};

export default App;
