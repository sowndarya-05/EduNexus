import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useNavigate } from 'react-router-dom';

const DashboardLayout = ({ children, user: propUser }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    const user = (propUser && propUser.role) ? propUser : (() => {
        try {
            return JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    })();

    const handleLogout = () => {
        sessionStorage.clear();
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar — always visible on desktop (md+), togglable on mobile */}
            <div className={`fixed inset-y-0 left-0 z-[100] transform transition-transform duration-300 ease-in-out ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}>
                <Sidebar user={user} logout={handleLogout} onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Mobile Overlay — only shows on small screens when sidebar is open */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden" 
                    onClick={() => setSidebarOpen(false)}
                >
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 md:pl-64">
                <Navbar user={user} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
                <main className="flex-1 p-6 lg:p-10 max-w-[1600px] w-full mx-auto">
                    <div className="animate-fade-in">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
