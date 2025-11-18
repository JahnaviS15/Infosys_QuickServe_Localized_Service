import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }} data-testid="payment-cancel-page">
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '3rem',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <XCircle size={64} style={{ color: '#f59e0b', margin: '0 auto 1.5rem' }} />
        <h2 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '1rem', color: '#1d1d1f' }} data-testid="cancel-title">
          Payment Cancelled
        </h2>
        <p style={{ color: '#86868b', marginBottom: '2rem' }}>
          Your payment was cancelled. You can try booking again whenever you're ready.
        </p>
        <button
          onClick={() => navigate('/user')}
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
          data-testid="back-to-dashboard-button"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default PaymentCancel;
