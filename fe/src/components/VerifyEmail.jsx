import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification token.');
      return;
    }

    const verify = async () => {
      try {
        await authAPI.verifyEmail(token);
        setStatus('success');
        setMessage('Your email has been verified successfully!');
        setTimeout(() => navigate('/login'), 3000);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.detail || 'Verification failed. The link may be expired.');
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="logo-text">Smart<b>Keep</b></h1>
          <p className="auth-subtitle">Email Verification</p>
        </div>

        <div className="verify-content">
          {status === 'loading' && (
            <div className="status-container">
              <Loader2 className="animate-spin text-accent" size={48} />
              <p>Verifying your email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="status-container">
              <CheckCircle className="text-success" size={48} />
              <p className="success-msg">{message}</p>
              <p className="redirect-hint">Redirecting to login in 3 seconds...</p>
              <button className="auth-btn mt-4" onClick={() => navigate('/login')}>
                Go to Login Now
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="status-container">
              <XCircle className="text-error" size={48} />
              <p className="error-msg">{message}</p>
              <button className="auth-btn mt-4" onClick={() => navigate('/register')}>
                Back to Registration
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-color);
          padding: 20px;
        }
        .auth-card {
          width: 100%;
          max-width: 400px;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 40px;
          text-align: center;
        }
        .logo-text { font-size: 32px; font-weight: 900; margin-bottom: 8px; }
        .logo-text b { color: var(--accent-color); }
        .auth-subtitle { color: var(--text-secondary); font-size: 14px; margin-bottom: 32px; }
        
        .status-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 20px 0;
        }
        
        .text-accent { color: var(--accent-color); }
        .text-success { color: #10b981; }
        .text-error { color: #ef4444; }
        
        .success-msg { color: #10b981; font-weight: 600; }
        .error-msg { color: #ef4444; font-weight: 500; }
        .redirect-hint { font-size: 12px; color: var(--text-secondary); }
        
        .auth-btn {
          width: 100%;
          padding: 12px;
          background: var(--accent-color);
          color: var(--bg-color);
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .auth-btn:hover { transform: translateY(-1px); filter: brightness(1.1); }
        .mt-4 { margin-top: 16px; }
      `}</style>
    </div>
  );
}

export default VerifyEmail;
