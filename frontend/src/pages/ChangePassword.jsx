import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaKey, FaArrowRight, FaEye, FaEyeSlash } from 'react-icons/fa';
import API from '../api';

const Spinner = () => (
    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
);

const ChangePassword = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const navigate = useNavigate();

    const storedUser = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const { data } = await API.post('/auth/change-password', { newPassword });
            setSuccessMsg('Password updated successfully! Redirecting...');
            
            // Update stored user object firstLogin = false
            const updatedUser = { ...storedUser, firstLogin: false };
            sessionStorage.setItem('user', JSON.stringify(updatedUser));
            localStorage.setItem('user', JSON.stringify(updatedUser));

            setTimeout(() => {
                const role = (updatedUser.role || 'ADMIN').toLowerCase();
                navigate(`/${role}`);
                window.location.reload();
            }, 1200);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-bg min-h-screen flex items-center justify-center p-4">
            <div className="login-blob login-blob-1" aria-hidden />
            <div className="login-blob login-blob-2" aria-hidden />
            <div className="login-grid" aria-hidden />

            <div className="glass-card animate-slide-up w-full max-w-md rounded-2xl px-8 py-9 relative z-10">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="relative inline-flex mb-4">
                        <div
                            className="absolute inset-0 rounded-xl blur-md opacity-50"
                            style={{ background: 'linear-gradient(135deg,#6d28d9,#8b5cf6)', transform: 'scale(1.18)' }}
                            aria-hidden
                        />
                        <div className="logo-icon relative w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl z-10">
                            <FaKey />
                        </div>
                    </div>

                    <h1 className="text-xl font-bold tracking-tight text-white">
                        First-Login Password Setup
                    </h1>
                    <p className="text-xs text-slate-400 mt-1 font-medium">
                        Welcome, <span className="text-indigo-300 font-semibold">{storedUser.name || 'User'}</span>! Please set a new secure password for your account to continue.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="px-3.5 py-3 rounded-xl text-xs font-medium text-center bg-rose-500/10 border border-rose-500/20 text-rose-300">
                            {error}
                        </div>
                    )}

                    {successMsg && (
                        <div className="px-3.5 py-3 rounded-xl text-xs font-medium text-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                            {successMsg}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="field-label block text-xs text-slate-300 font-medium">New Password</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-indigo-400/60">
                                <FaLock size={13} />
                            </span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="edu-input w-full pl-9 pr-11 py-3 text-sm"
                                placeholder="Enter new password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-indigo-400 transition-colors"
                            >
                                {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="field-label block text-xs text-slate-300 font-medium">Confirm New Password</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-indigo-400/60">
                                <FaLock size={13} />
                            </span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="edu-input w-full pl-9 pr-4 py-3 text-sm"
                                placeholder="Confirm new password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full mt-3 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm ${loading ? 'btn-shimmer' : 'btn-primary'}`}
                    >
                        {loading ? (
                            <><Spinner /><span>Updating Password...</span></>
                        ) : (
                            <><span>Save & Continue</span><FaArrowRight size={11} /></>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;
