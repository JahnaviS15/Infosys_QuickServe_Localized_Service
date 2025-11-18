import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PaymentSuccess = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('checking');
  const [bookingId, setBookingId] = useState(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      checkPaymentStatus();
    }
  }, [sessionId]);

  const checkPaymentStatus = async () => {
    let attempts = 0;
    const maxAttempts = 5;
    const pollInterval = 2000;

    const poll = async () => {
      try {
        const response = await axios.get(
          `${API}/payments/checkout-status/${sessionId}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );

        if (response.data.payment_status === 'paid') {
          setStatus('success');
          setBookingId(response.data.booking_id);
          toast.success('Payment successful!');
          return;
        } else if (response.data.status === 'expired') {
          setStatus('failed');
          toast.error('Payment session expired');
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, pollInterval);
        } else {
          setStatus('timeout');
        }
      } catch (error) {
        console.error('Payment check error:', error);
        setStatus('error');
      }
    };

    poll();
  };

  const handleContinue = () => {
    if (user) {
      navigate('/user');
    } else {
      navigate('/');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }} data-testid="payment-success-page">
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '3rem',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {status === 'checking' && (
          <>
            <Loader size={64} style={{ color: '#667eea', margin: '0 auto 1.5rem', animation: 'spin 1s linear infinite' }} />
            <h2 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '1rem' }}>Verifying Payment...</h2>
            <p style={{ color: '#86868b' }}>Please wait while we confirm your payment</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={64} style={{ color: '#22c55e', margin: '0 auto 1.5rem' }} />
            <h2 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '1rem', color: '#1d1d1f' }} data-testid="success-title">
              Payment Successful!
            </h2>
            <p style={{ color: '#86868b', marginBottom: '2rem' }}>
              Your booking has been confirmed. You will receive updates on your service status.
            </p>
            <button
              onClick={handleContinue}
              style={{
                padding: '1rem 2rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%'
              }}
              data-testid="continue-button"
            >
              Continue to Dashboard
            </button>
          </>
        )}

        {(status === 'failed' || status === 'timeout' || status === 'error') && (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1.5rem',
              background: '#ef4444',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '2rem'
            }}>
              ×
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '1rem', color: '#1d1d1f' }}>
              Payment Verification {status === 'timeout' ? 'Timeout' : 'Failed'}
            </h2>
            <p style={{ color: '#86868b', marginBottom: '2rem' }}>
              {status === 'timeout' 
                ? 'Payment verification timed out. Please check your email for confirmation or contact support.'
                : 'We could not verify your payment. Please try again or contact support.'}
            </p>
            <button
              onClick={handleContinue}
              style={{
                padding: '1rem 2rem',
                background: '#f5f5f7',
                color: '#1d1d1f',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Go Back
            </button>
          </>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default PaymentSuccess;
