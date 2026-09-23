import { Link, useLocation } from 'react-router-dom';
import {
    FaHome, FaUserGraduate, FaChalkboardTeacher,
    FaMoneyBillWave, FaSignOutAlt,
    FaBook, FaClipboardCheck, FaCalendarCheck, FaRobot, FaChartBar
} from 'react-icons/fa';

const Sidebar = ({ user: propUser, logout, onClose }) => {
    const location = useLocation();

    const user = (propUser && propUser.role) ? propUser : (() => {
        try {
            return JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    })();

    const menuItems = {
        ADMIN: [
            { path: '/admin', icon: FaHome, label: 'Dashboard' },
            { path: '/admin/students', icon: FaUserGraduate, label: 'Students' },
            { path: '/admin/teachers', icon: FaChalkboardTeacher, label: 'Teachers' },
            { path: '/admin/batches', icon: FaBook, label: 'Batches' },
            { path: '/admin/fees', icon: FaMoneyBillWave, label: 'Fees & Payments' },
            { path: '/admin/attendance', icon: FaCalendarCheck, label: 'Attendance' },
            { path: '/admin/insights', icon: FaRobot, label: 'AI Insights' },
        ],
        TEACHER: [
            { path: '/teacher', icon: FaHome, label: 'Dashboard' },
            { path: '/teacher/attendance', icon: FaClipboardCheck, label: 'Mark Attendance' },
            { path: '/teacher/scores', icon: FaChartBar, label: 'Update Scores' },
            { path: '/teacher/students', icon: FaUserGraduate, label: 'My Students' },
            { path: '/teacher/messages', icon: FaChalkboardTeacher, label: 'Messages' },
        ],
        PARENT: [
            { path: '/parent', icon: FaHome, label: 'Dashboard' },
            { path: '/parent/attendance', icon: FaCalendarCheck, label: 'Attendance' },
            { path: '/parent/performance', icon: FaChartBar, label: 'Performance' },
            { path: '/parent/fees', icon: FaMoneyBillWave, label: 'Fees & Billing' },
            { path: '/parent/messages', icon: FaChalkboardTeacher, label: 'Messages' },
        ]
    };

    const currentMenu = menuItems[user?.role?.toUpperCase()] || [];

    // For the sidebar active state, use startsWith for nested routes but exact match for /admin
    const isActive = (itemPath) => {
        if (itemPath === '/admin' || itemPath === '/teacher' || itemPath === '/parent') {
            return location.pathname === itemPath;
        }
        return location.pathname === itemPath || location.pathname.startsWith(itemPath + '/');
    };

    return (
        <div className="flex flex-col h-screen w-64 bg-slate-900 text-slate-100 border-r border-slate-800 shadow-xl">
            {/* Logo Section */}
            <div className="flex items-center gap-3 px-6 h-20 border-b border-slate-800/80">
                <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center font-extrabold text-lg text-white shadow-md shadow-indigo-600/30">
                    E
                </div>
                <div>
                    <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1">
                        EduNexus <span className="text-xs text-indigo-400 font-semibold bg-indigo-500/10 px-1.5 py-0.5 rounded">AI</span>
                    </h1>
                </div>
            </div>

            {/* User Info Card */}
            <div className="px-4 py-4 border-b border-slate-800/40">
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800/50">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-300 mb-1.5 uppercase tracking-wider">
                        {user?.role}
                    </span>
                    <p className="font-semibold text-slate-100 text-sm truncate">{user?.name}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email}</p>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {currentMenu.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 group ${
                                active
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                            }`}
                        >
                            <item.icon className={`text-base transition-transform group-hover:scale-105 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / Logout */}
            <div className="p-4 border-t border-slate-800/80">
                <button
                    onClick={logout}
                    className="flex items-center justify-center gap-2.5 w-full px-4 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors font-medium border border-transparent hover:border-red-500/15"
                >
                    <FaSignOutAlt className="text-base" />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
