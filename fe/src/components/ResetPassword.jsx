import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, success, error
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      await authAPI.resetPassword(token, password);
      setStatus('success');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. The link may be expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'success') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <CheckCircle className="text-success mx-auto mb-4" size={48} />
          <h2>Password Reset Successful</h2>
          <p className="mt-2 text-secondary">Your password has been updated. Redirecting to login...</p>
          <button className="auth-btn mt-6" onClick={() => navigate('/login')}>
            Login Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="logo-text">Smart<b>Keep</b></h1>
          <p className="auth-subtitle">Set your new password</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>New Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label>Confirm New Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="auth-btn" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Reset Password'}
          </button>
        </form>
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
        }
        .auth-header { text-align: center; margin-bottom: 32px; }
        .logo-text { font-size: 32px; font-weight: 900; margin-bottom: 8px; }
        .logo-text b { color: var(--accent-color); }
        .auth-subtitle { color: var(--text-secondary); font-size: 14px; }
        
        .auth-form { display: flex; flex-direction: column; gap: 20px; }
        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
        
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          color: var(--text-secondary);
          opacity: 0.5;
        }
        .input-wrapper input {
          width: 100%;
          padding: 12px 40px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-color);
          font-size: 14px;
          transition: all 0.2s;
        }
        .input-wrapper input:focus {
          border-color: var(--accent-color);
          outline: none;
          background: rgba(255, 255, 255, 0.08);
        }
        
        .password-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          opacity: 0.5;
        }
        .password-toggle:hover { opacity: 1; }
        
        .auth-btn {
          margin-top: 12px;
          padding: 14px;
          background: var(--accent-color);
          color: var(--bg-color);
          border: none;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .auth-btn:hover { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .auth-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        
        .error-message {
          padding: 10px;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 6px;
          color: #ef4444;
          font-size: 13px;
          text-align: center;
        }
        .text-success { color: #10b981; }
        .mx-auto { margin-left: auto; margin-right: auto; }
        .mt-6 { margin-top: 24px; }
      `}</style>
    </div>
  );
}

export default ResetPassword;
