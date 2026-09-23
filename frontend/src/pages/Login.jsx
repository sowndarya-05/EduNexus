import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaEnvelope, FaLock, FaGraduationCap,
  FaEye, FaEyeSlash, FaArrowRight, FaKey, FaTimes, FaCheckCircle
} from 'react-icons/fa';
import API from '../api';

const Spinner = () => (
  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: enter email, 2: enter code & new pass
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await API.post('/auth/login', formData);
      sessionStorage.setItem('user', JSON.stringify(data));
      sessionStorage.setItem('token', JSON.stringify(data.token));
      localStorage.setItem('user', JSON.stringify(data));
      localStorage.setItem('token', JSON.stringify(data.token));

      if (data.firstLogin) {
        navigate('/change-password');
      } else {
        navigate(`/${data.role.toLowerCase()}`);
      }
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Step 1: Request Code
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMsg('');
    setForgotLoading(true);

    try {
      const { data } = await API.post('/auth/forgot-password', { email: forgotEmail });
      setForgotMsg(`Reset code sent! Code: ${data.resetCode}`);
      if (data.resetCode) {
        setResetCode(data.resetCode);
      }
      setForgotStep(2);
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to process request. Please verify email.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot Password Step 2: Reset Password
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMsg('');
    setForgotLoading(true);

    try {
      const { data } = await API.post('/auth/reset-password', {
        email: forgotEmail,
        resetCode,
        newPassword
      });
      setForgotMsg(data.message || 'Password reset successful!');
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotStep(1);
        setFormData(prev => ({ ...prev, email: forgotEmail, password: '' }));
      }, 1500);
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Password reset failed. Please check your code.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-bg min-h-screen flex items-center justify-center p-4">
      <div className="login-blob login-blob-1" aria-hidden />
      <div className="login-blob login-blob-2" aria-hidden />
      <div className="login-grid" aria-hidden />

      {/* ── Card ── */}
      <div className="glass-card animate-slide-up w-full max-w-sm rounded-2xl px-8 py-9 relative z-10">

        {/* Header */}
        <div className="text-center mb-7">
          <div className="relative inline-flex mb-4">
            <div
              className="absolute inset-0 rounded-xl blur-md opacity-50"
              style={{ background: 'linear-gradient(135deg,#6d28d9,#8b5cf6)', transform: 'scale(1.18)' }}
              aria-hidden
            />
            <div className="logo-icon relative w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl z-10">
              <FaGraduationCap />
            </div>
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
            EduNexus&nbsp;
            <span style={{
              background: 'linear-gradient(90deg,#a78bfa,#c4b5fd)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>AI</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
            Sign in to your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4" noValidate>

          {error && (
            <div
              className="px-3.5 py-3 rounded-xl text-xs font-medium text-center animate-fade-in"
              style={{
                background: 'rgba(239,68,68,0.10)',
                border: '1px solid rgba(239,68,68,0.20)',
                color: '#fca5a5',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {error}
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="field-label block">Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none"
                style={{ color: 'rgba(167,139,250,0.5)' }}>
                <FaEnvelope size={13} />
              </span>
              <input
                id="login-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className="edu-input w-full pl-9 pr-4 py-3"
                placeholder="name@institution.com"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="field-label">Password</label>
              <button
                type="button"
                id="forgot-password-link"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.70rem',
                  fontWeight: 500,
                  color: 'rgba(167,139,250,0.70)',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#a78bfa'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(167,139,250,0.70)'}
                onClick={() => {
                  setForgotEmail(formData.email);
                  setForgotStep(1);
                  setForgotMsg('');
                  setForgotError('');
                  setShowForgotModal(true);
                }}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none"
                style={{ color: 'rgba(167,139,250,0.5)' }}>
                <FaLock size={13} />
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                className="edu-input w-full pl-9 pr-11 py-3"
                placeholder="••••••••"
              />
              <button
                type="button"
                id="toggle-password-visibility"
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors duration-150"
                style={{ color: 'rgba(148,163,184,0.5)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#a78bfa'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(148,163,184,0.5)'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className={`w-full mt-1 py-3 rounded-xl flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-transparent ${loading ? 'btn-shimmer' : 'btn-primary'}`}
          >
            {loading ? (
              <><Spinner /><span>Signing in…</span></>
            ) : (
              <><span>Sign In</span><FaArrowRight size={11} /></>
            )}
          </button>
        </form>

        <p className="text-center mt-6" style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.65rem',
          color: 'rgba(100,116,139,0.45)',
        }}>
          © 2026 EduNexus AI
        </p>
      </div>

      {/* ── Forgot Password Modal ── */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass-card animate-scale-up w-full max-w-md rounded-2xl p-7 relative border border-slate-700/50 shadow-2xl">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <FaTimes size={16} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center border border-violet-500/30">
                <FaKey size={16} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset Password</h3>
                <p className="text-xs text-slate-400">
                  {forgotStep === 1 ? 'Enter your account email to receive a reset code' : 'Enter the code and set a new password'}
                </p>
              </div>
            </div>

            {forgotError && (
              <div className="mb-4 px-3.5 py-2.5 rounded-xl text-xs font-medium text-center bg-rose-500/10 border border-rose-500/20 text-rose-300">
                {forgotError}
              </div>
            )}

            {forgotMsg && (
              <div className="mb-4 px-3.5 py-2.5 rounded-xl text-xs font-medium text-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-center gap-2">
                <FaCheckCircle /> {forgotMsg}
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleForgotRequest} className="space-y-4">
                <div>
                  <label className="field-label block text-xs text-slate-300 mb-1.5">Account Email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="edu-input w-full px-4 py-2.5 text-sm"
                    placeholder="e.g. user@institution.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 rounded-xl btn-primary text-xs font-semibold flex items-center justify-center gap-2"
                >
                  {forgotLoading ? <Spinner /> : 'Get Reset Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="field-label block text-xs text-slate-300 mb-1.5">6-Digit Reset Code</label>
                  <input
                    type="text"
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className="edu-input w-full px-4 py-2.5 text-sm"
                    placeholder="Enter reset code"
                  />
                </div>
                <div>
                  <label className="field-label block text-xs text-slate-300 mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="edu-input w-full px-4 py-2.5 text-sm"
                    placeholder="At least 6 characters"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 rounded-xl btn-primary text-xs font-semibold flex items-center justify-center gap-2"
                >
                  {forgotLoading ? <Spinner /> : 'Reset Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
