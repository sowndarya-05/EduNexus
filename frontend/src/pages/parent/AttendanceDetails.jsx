import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    FaCheckCircle, FaTimesCircle, FaCalendarAlt, FaUserGraduate, 
    FaClock, FaChevronLeft, FaExclamationTriangle
} from 'react-icons/fa';
import DashboardLayout from '../../components/layout/DashboardLayout';
import API from '../../api';

const AttendanceDetails = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [user] = useState(() => {
        const saved = sessionStorage.getItem('user');
        try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
    });
    const [students, setStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState(location.state?.studentId || '');
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
    const [attendanceRecord, setAttendanceRecord] = useState([]);
    const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => { 
        fetchChildren(); 
    }, []);

    useEffect(() => { 
        if (selectedStudentId) {
            fetchAttendance();
        } 
    }, [selectedStudentId, filterMonth]);

    const fetchChildren = async () => {
        try {
            const { data } = await API.get('/students');
            const list = Array.isArray(data) ? data : [];
            setStudents(list);
            if (list.length > 0 && !selectedStudentId) {
                setSelectedStudentId(list[0]._id);
            }
        } catch (error) { 
            console.error('Failed to fetch children', error); 
        }
    };

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            const [yearStr, monthStr] = (filterMonth || '').split('-');
            const month = parseInt(monthStr, 10);
            const year = parseInt(yearStr, 10);

            const { data } = await API.get(`/attendance?studentId=${selectedStudentId}&month=${month}&year=${year}`);
            const list = Array.isArray(data) ? data : [];
            setAttendanceRecord(list);
            const present = list.filter(r => ['Present', 'PRESENT', 'Late', 'LATE'].includes(r.status)).length;
            setStats({ total: list.length, present, absent: list.length - present });
        } catch (error) { 
            console.error('Failed to fetch attendance', error); 
        } finally { 
            setLoading(false); 
        }
    };

    const selectedStudent = students.find(s => s._id === selectedStudentId) || students[0];
    const attendancePct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
    const isGoodStanding = attendancePct >= 75;

    return (
        <DashboardLayout user={user}>
            <div className="max-w-6xl mx-auto space-y-8 py-2 pb-16">
                
                {/* ── 1. Page Header with Breadcrumb & Filters ── */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm">
                    <div className="space-y-1">
                        <button
                            onClick={() => navigate('/parent')}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer mb-1"
                        >
                            <FaChevronLeft size={9} /> Back to Dashboard
                        </button>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                            Attendance History
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                            Monthly classroom attendance and session participation registry.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Student Switcher if > 1 */}
                        {students.length > 1 && (
                            <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl">
                                <FaUserGraduate size={12} className="text-indigo-600 shrink-0" />
                                <div className="text-left">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Student</p>
                                    <select
                                        value={selectedStudentId}
                                        onChange={(e) => setSelectedStudentId(e.target.value)}
                                        className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
                                    >
                                        {students.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Month Picker */}
                        <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl">
                            <FaCalendarAlt size={12} className="text-indigo-600 shrink-0" />
                            <div className="text-left">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Month</p>
                                <input
                                    type="month"
                                    value={filterMonth}
                                    onChange={(e) => setFilterMonth(e.target.value)}
                                    className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── 2. Attendance Summary KPI Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                    {/* Total Sessions */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Sessions</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-2">
                            {loading ? '...' : stats.total}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">Conducted this month</p>
                    </div>

                    {/* Days Present */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Days Present</p>
                        <h3 className="text-3xl font-extrabold text-emerald-600 tracking-tight mt-2">
                            {loading ? '...' : stats.present}
                        </h3>
                        <p className="text-xs text-emerald-700 font-semibold mt-1">Attended classes</p>
                    </div>

                    {/* Days Absent */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Days Absent</p>
                        <h3 className="text-3xl font-extrabold text-rose-600 tracking-tight mt-2">
                            {loading ? '...' : stats.absent}
                        </h3>
                        <p className="text-xs text-rose-700 font-semibold mt-1">Missed sessions</p>
                    </div>

                    {/* Attendance Percentage */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly Rate</p>
                        <h3 className="text-3xl font-extrabold text-indigo-600 tracking-tight mt-2">
                            {loading ? '...' : `${attendancePct}%`}
                        </h3>
                        <p className={`text-xs font-bold mt-1 ${isGoodStanding ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {stats.total === 0 ? 'No sessions' : (isGoodStanding ? '✓ Good Standing' : '⚠ Below 75% Target')}
                        </p>
                    </div>
                </div>

                {/* ── 3. Monthly Progress Rate Banner ── */}
                {stats.total > 0 && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">
                                    Attendance Fulfillment for {selectedStudent?.name || 'Scholar'}
                                </h3>
                                <p className="text-xs text-slate-400 font-medium">
                                    {stats.present} of {stats.total} scheduled classes attended
                                </p>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto border ${
                                isGoodStanding 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                                {isGoodStanding ? <FaCheckCircle size={10} /> : <FaExclamationTriangle size={10} />}
                                {isGoodStanding ? 'Active Compliance (≥ 75%)' : 'Attendance Alert (< 75%)'}
                            </span>
                        </div>

                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-700 ${
                                    isGoodStanding 
                                        ? 'bg-gradient-to-r from-teal-500 to-emerald-500' 
                                        : 'bg-gradient-to-r from-amber-500 to-rose-500'
                                }`}
                                style={{ width: `${Math.min(attendancePct, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* ── 4. Detailed Attendance Session Log ── */}
                <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                        <h2 className="text-sm font-bold text-slate-800">
                            Daily Session Log ({attendanceRecord.length} records)
                        </h2>
                        <span className="text-xs text-slate-400 font-medium">
                            {new Date(filterMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-3"></div>
                            <p className="text-xs text-slate-400 font-medium">Loading session records...</p>
                        </div>
                    ) : attendanceRecord.length === 0 ? (
                        <div className="p-16 text-center space-y-2">
                            <FaCalendarAlt size={32} className="text-slate-300 mx-auto" />
                            <h3 className="text-sm font-bold text-slate-700">No Attendance Records Found</h3>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                No classroom attendance records were marked for the selected month.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                                        <th className="px-6 py-3.5">Session Date</th>
                                        <th className="px-6 py-3.5">Batch / Course</th>
                                        <th className="px-6 py-3.5 text-right">Attendance Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {attendanceRecord.map((record, i) => {
                                        const statusStr = (record.status || '').toUpperCase();
                                        const isPresent = statusStr === 'PRESENT' || statusStr === 'LATE';
                                        
                                        return (
                                            <tr key={record._id || i} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-800">
                                                        {new Date(record.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 font-medium">
                                                        {new Date(record.date).toLocaleDateString(undefined, { weekday: 'long' })}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-700">{record.batch?.name || 'Academic Batch'}</p>
                                                    <p className="text-[11px] text-slate-400 font-medium">{record.batch?.subject || 'General Studies'}</p>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                                        isPresent 
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                    }`}>
                                                        {isPresent ? <FaCheckCircle size={10} /> : <FaTimesCircle size={10} />}
                                                        <span>{record.status || 'Marked'}</span>
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </DashboardLayout>
    );
};

export default AttendanceDetails;
