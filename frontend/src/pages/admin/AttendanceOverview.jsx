import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaCalendarAlt, FaCheckCircle, FaTimesCircle,
    FaPercentage, FaLayerGroup, FaUserSlash, FaTimes,
    FaUsers, FaExclamationTriangle
} from 'react-icons/fa';
import DashboardLayout from '../../components/layout/DashboardLayout';
import API from '../../api';

const AttendanceOverview = () => {
    const [user] = useState(() => {
        const saved = sessionStorage.getItem('user') || localStorage.getItem('user');
        try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.slice(0, 7);
    const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'monthly'
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

    // Batch cards state
    const [batchSummaries, setBatchSummaries] = useState([]);
    const [batchLoading, setBatchLoading] = useState(true);

    // KPI strip state
    const [kpi, setKpi] = useState({
        todayOverallPercent: 0,
        batchesNotMarkedCount: 0,
        chronicAbsenteesCount: 0
    });
    const [kpiLoading, setKpiLoading] = useState(true);

    // Chronic absentees state
    const [chronicAbsentees, setChronicAbsentees] = useState([]);
    const [chronicLoading, setChronicLoading] = useState(true);

    // Absentee modal state
    const [absenteeModal, setAbsenteeModal] = useState(null); // { batchId, batchName }
    const [absenteeList, setAbsenteeList] = useState([]);
    const [absenteeLoading, setAbsenteeLoading] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        fetchKpi();
        fetchChronicAbsentees();
    }, []);

    useEffect(() => {
        fetchBatchSummaries();
    }, [viewMode, selectedDate, selectedMonth]);

    const fetchKpi = async () => {
        try {
            setKpiLoading(true);
            const { data } = await API.get('/admin/attendance/kpi');
            setKpi(data);
        } catch (error) {
            console.error('Failed to fetch attendance KPI', error);
        } finally {
            setKpiLoading(false);
        }
    };

    const fetchBatchSummaries = async () => {
        try {
            setBatchLoading(true);
            let url = '';
            if (viewMode === 'monthly') {
                const [year, month] = selectedMonth.split('-');
                url = `/admin/attendance/batches?month=${parseInt(month, 10)}&year=${parseInt(year, 10)}`;
            } else {
                url = `/admin/attendance/batches?date=${selectedDate}`;
            }
            const { data } = await API.get(url);
            setBatchSummaries(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch batch attendance summaries', error);
            if (error.response?.status === 401) navigate('/login');
        } finally {
            setBatchLoading(false);
        }
    };

    const fetchChronicAbsentees = async () => {
        try {
            setChronicLoading(true);
            const { data } = await API.get('/admin/attendance/chronic-absentees');
            setChronicAbsentees(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch chronic absentees', error);
        } finally {
            setChronicLoading(false);
        }
    };

    const openAbsenteeModal = async (batch) => {
        setAbsenteeModal({ batchId: batch.batchId, batchName: batch.batchName });
        setAbsenteeList([]);
        setAbsenteeLoading(true);
        try {
            const { data } = await API.get(`/admin/attendance/batch/${batch.batchId}/absentees?date=${selectedDate}`);
            setAbsenteeList(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch absentees', error);
        } finally {
            setAbsenteeLoading(false);
        }
    };

    const closeAbsenteeModal = () => {
        setAbsenteeModal(null);
        setAbsenteeList([]);
    };

    const getAttendanceColor = (percent) => {
        const p = Number(percent) || 0;
        if (p >= 85) return { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Good' };
        if (p >= 70) return { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Average' };
        return { bar: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', label: 'Poor' };
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Attendance Intelligence</h1>
                        <p className="text-xs font-medium text-slate-400 mt-1">Real-time participation tracking per batch (Daily & Monthly analytics)</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Daily / Monthly toggle */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                            <button
                                onClick={() => setViewMode('daily')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                    viewMode === 'daily' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Daily
                            </button>
                            <button
                                onClick={() => setViewMode('monthly')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                    viewMode === 'monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Monthly
                            </button>
                        </div>

                        {/* Date or Month Picker */}
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 border border-slate-200 rounded-xl">
                            <FaCalendarAlt className="text-indigo-600" size={13} />
                            {viewMode === 'daily' ? (
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                                />
                            ) : (
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* KPI Strip — 3 metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-premium flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                            kpi.todayOverallPercent >= 80
                                ? 'bg-emerald-50 text-emerald-600'
                                : kpi.todayOverallPercent >= 60
                                    ? 'bg-amber-50 text-amber-600'
                                    : 'bg-rose-50 text-rose-600'
                        }`}>
                            <FaPercentage />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Today's Attendance</p>
                            <h3 className={`text-2xl font-extrabold mt-0.5 ${
                                kpiLoading ? 'text-slate-300' :
                                    kpi.todayOverallPercent >= 80 ? 'text-emerald-600' :
                                        kpi.todayOverallPercent >= 60 ? 'text-amber-600' : 'text-rose-600'
                            }`}>
                                {kpiLoading ? '—' : `${kpi.todayOverallPercent}%`}
                            </h3>
                            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Overall across all batches</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-premium flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl flex-shrink-0">
                            <FaLayerGroup />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Batches Not Marked</p>
                            <h3 className="text-2xl font-extrabold text-amber-600 mt-0.5">
                                {kpiLoading ? '—' : kpi.batchesNotMarkedCount}
                            </h3>
                            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Attendance pending today</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-premium flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl flex-shrink-0">
                            <FaUserSlash />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Chronic Absentees</p>
                            <h3 className="text-2xl font-extrabold text-rose-600 mt-0.5">
                                {kpiLoading ? '—' : kpi.chronicAbsenteesCount}
                            </h3>
                            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Absent 3+ consecutive days</p>
                        </div>
                    </div>
                </div>

                {/* Batch Cards Grid */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <FaLayerGroup className="text-indigo-500" />
                            Batch Attendance —&nbsp;
                            <span className="text-indigo-600 font-extrabold">
                                {viewMode === 'monthly'
                                    ? new Date(selectedMonth + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                                    : selectedDate === todayStr ? 'Today' : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                        </h2>
                        <span className="text-xs font-semibold text-slate-400">{batchSummaries.length} batches</span>
                    </div>

                    {batchLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600" />
                        </div>
                    ) : batchSummaries.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <FaLayerGroup size={24} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-700">No attendance data for this date</h3>
                            <p className="text-xs text-slate-400 mt-1">Batch-wise attendance will appear here once recorded.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {batchSummaries.map((batch) => {
                                const colors = getAttendanceColor(batch.attendancePercent);
                                const pct = Math.min(100, Math.max(0, Number(batch.attendancePercent) || 0));

                                return (
                                    <div
                                        key={batch.batchId}
                                        className="bg-white rounded-2xl border border-slate-100 shadow-premium p-5 flex flex-col gap-4 hover:shadow-premium-hover transition-all"
                                    >
                                        {/* Card Header */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-extrabold text-slate-800 text-sm">{batch.batchName}</h3>
                                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                                                    {batch.marked ? 'Attendance Marked' : 'Not Yet Marked'}
                                                </p>
                                            </div>
                                            <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-xl uppercase tracking-wider ${colors.bg} ${colors.text} border ${colors.border}`}>
                                                {colors.label}
                                            </span>
                                        </div>

                                        {/* Attendance Bar */}
                                        <div>
                                            <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5">
                                                <span>Attendance Rate</span>
                                                <span className={`font-extrabold ${colors.text}`}>{pct.toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Student Counts */}
                                        <div className="grid grid-cols-3 gap-3 pt-1 border-t border-slate-100">
                                            <div className="text-center">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
                                                <p className="text-lg font-extrabold text-slate-800 mt-0.5">{batch.totalStudents}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-bold text-emerald-500 uppercase">Present</p>
                                                <p className="text-lg font-extrabold text-emerald-700 mt-0.5">{batch.presentCount}</p>
                                            </div>
                                            <div className="text-center">
                                                <button
                                                    onClick={() => batch.absentCount > 0 && openAbsenteeModal(batch)}
                                                    disabled={batch.absentCount === 0}
                                                    className={`w-full text-center rounded-xl transition-colors ${
                                                        batch.absentCount > 0
                                                            ? 'hover:bg-rose-50 cursor-pointer'
                                                            : 'cursor-default'
                                                    }`}
                                                >
                                                    <p className="text-[10px] font-bold text-rose-400 uppercase">Absent</p>
                                                    <p className={`text-lg font-extrabold mt-0.5 ${batch.absentCount > 0 ? 'text-rose-600 underline decoration-dotted' : 'text-slate-400'}`}>
                                                        {batch.absentCount}
                                                    </p>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Chronic Absentees List */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-premium overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center">
                            <FaExclamationTriangle size={14} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Chronic Absentees</h3>
                            <p className="text-[10px] font-medium text-slate-400">Students absent 3 or more consecutive days</p>
                        </div>
                    </div>

                    {chronicLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-rose-400" />
                        </div>
                    ) : chronicAbsentees.length === 0 ? (
                        <div className="py-10 text-center">
                            <FaCheckCircle className="mx-auto text-emerald-400 mb-2" size={28} />
                            <p className="text-sm font-bold text-slate-600">No chronic absentees</p>
                            <p className="text-xs text-slate-400 mt-1">All students have regular attendance.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="py-3 px-6">Student</th>
                                        <th className="py-3 px-6">Batch</th>
                                        <th className="py-3 px-6">Consecutive Absences</th>
                                        <th className="py-3 px-6">Parent Email</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {chronicAbsentees.map((s, idx) => (
                                        <tr key={s._id || s.studentId || idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3.5 px-6">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                                        {(s.name || '?')[0].toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-slate-800">{s.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-6 font-semibold text-indigo-600">{s.batchName || 'N/A'}</td>
                                            <td className="py-3.5 px-6">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">
                                                    <FaTimesCircle size={10} /> {s.consecutiveDays || s.consecutiveAbsences || s.absences || '—'} days
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-6 text-slate-500 font-medium">{s.parentEmail || s.email || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Absentee Modal */}
            {absenteeModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                    <div className="bg-white rounded-3xl p-7 max-w-md w-full border border-slate-100 shadow-2xl relative max-h-[80vh] flex flex-col">
                        <button
                            onClick={closeAbsenteeModal}
                            className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                            <FaTimes size={16} />
                        </button>

                        <div className="mb-5">
                            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Absent Students</h2>
                            <p className="text-xs text-slate-400 font-medium mt-1">
                                {absenteeModal.batchName} &nbsp;·&nbsp;
                                {selectedDate === todayStr ? 'Today' : new Date(selectedDate + 'T00:00:00').toLocaleDateString()}
                            </p>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            {absenteeLoading ? (
                                <div className="flex items-center justify-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-rose-400" />
                                </div>
                            ) : absenteeList.length === 0 ? (
                                <div className="text-center py-8">
                                    <FaCheckCircle className="mx-auto text-emerald-400 mb-2" size={28} />
                                    <p className="text-sm font-bold text-slate-600">No absentees</p>
                                    <p className="text-xs text-slate-400 mt-1">All students were present.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {absenteeList.map((student, idx) => (
                                        <div
                                            key={student._id || student.studentId || idx}
                                            className="flex items-center gap-3 p-3 bg-rose-50/60 border border-rose-100 rounded-xl"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-white border border-rose-200 text-rose-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                                {(student.name || '?')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{student.name}</p>
                                                {(student.parentEmail || student.email) && (
                                                    <p className="text-[10px] text-slate-400 font-medium">{student.parentEmail || student.email}</p>
                                                )}
                                            </div>
                                            <FaTimesCircle className="ml-auto text-rose-400 flex-shrink-0" size={14} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {!absenteeLoading && absenteeList.length > 0 && (
                            <div className="pt-4 mt-4 border-t border-slate-100 text-center">
                                <p className="text-xs font-semibold text-slate-400">
                                    {absenteeList.length} student{absenteeList.length !== 1 ? 's' : ''} absent
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default AttendanceOverview;
