import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaExclamationTriangle, FaCheckCircle, FaRobot,
    FaBell, FaUserShield, FaSortAmountDown, FaChartPie, FaLayerGroup
} from 'react-icons/fa';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AIAlert from '../../components/ui/AIAlert';
import API from '../../api';

const RISK_TABS = ['All', 'High', 'Medium', 'Low'];
const SORT_OPTIONS = [
    { value: 'risk', label: 'Risk Score' },
    { value: 'batch', label: 'Batch' },
    { value: 'name', label: 'Name (A–Z)' }
];

const AIInsights = () => {
    const [user] = useState(() => {
        const saved = sessionStorage.getItem('user') || localStorage.getItem('user');
        try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
    });
    const [insights, setInsights] = useState([]);
    const [riskBreakdown, setRiskBreakdown] = useState({ safe: 0, medium: 0, high: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');
    const [sortBy, setSortBy] = useState('risk');
    const [bulkReminderSent, setBulkReminderSent] = useState(false);
    const [bulkSending, setBulkSending] = useState(false);
    const [recalculating, setRecalculating] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchInsights();
        fetchRiskBreakdown();
    }, []);

    const fetchRiskBreakdown = async () => {
        try {
            const { data } = await API.get('/admin/insights/risk-breakdown');
            if (data) setRiskBreakdown(data);
        } catch (error) {
            console.error('Failed to fetch risk breakdown', error);
        }
    };

    const fetchInsights = async () => {
        try {
            setLoading(true);
            const { data } = await API.get('/analytics');
            const sorted = [...data].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
            setInsights(sorted);
        } catch (error) {
            console.error('Failed to fetch insights', error);
            if (error.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const handleRecalculateRisk = async () => {
        setRecalculating(true);
        try {
            await API.post('/analytics/calculate-risk');
            await Promise.all([fetchInsights(), fetchRiskBreakdown()]);
        } catch (error) {
            console.error('Failed to recalculate risk', error);
            alert('Failed to recalculate risk: ' + (error.response?.data?.message || error.message));
        } finally {
            setRecalculating(false);
        }
    };

    const highRisk = insights.filter(i => i.riskLevel === 'HIGH');
    const mediumRisk = insights.filter(i => i.riskLevel === 'MEDIUM');
    const lowRisk = insights.filter(i => i.riskLevel === 'LOW' || !i.riskLevel);

    // Filter list based on active tab
    const tabFiltered = activeTab === 'All'
        ? insights
        : activeTab === 'High'
            ? highRisk
            : activeTab === 'Medium'
                ? mediumRisk
                : lowRisk;

    // Sort filtered list
    const filteredInsights = [...tabFiltered].sort((a, b) => {
        if (sortBy === 'risk') return (b.riskScore || 0) - (a.riskScore || 0);
        if (sortBy === 'batch') {
            const ba = (a.batch?.name || 'zzz').toLowerCase();
            const bb = (b.batch?.name || 'zzz').toLowerCase();
            return ba.localeCompare(bb);
        }
        if (sortBy === 'name') {
            return (a.name || '').localeCompare(b.name || '');
        }
        return 0;
    });

    // Group by batch when sortBy === 'batch'
    const groupedByBatch = sortBy === 'batch'
        ? filteredInsights.reduce((acc, student) => {
            const batchName = student.batch?.name || 'Unassigned';
            if (!acc[batchName]) acc[batchName] = [];
            acc[batchName].push(student);
            return acc;
        }, {})
        : null;

    // Bulk send reminder to all High Risk parents
    const handleSendBulkReminder = async () => {
        if (highRisk.length === 0) return;
        const confirmed = window.confirm(
            `Send a reminder message to parents of all ${highRisk.length} High Risk student(s)?`
        );
        if (!confirmed) return;

        setBulkSending(true);
        try {
            await Promise.all(
                highRisk
                    .filter(s => s.parent?._id)
                    .map(s =>
                        API.post('/messages', {
                            receiverId: s.parent._id,
                            text: `REMINDER: ${s.name} has been flagged as High Risk. Please contact the institute immediately for support and intervention.`
                        })
                    )
            );
            setBulkReminderSent(true);
            setTimeout(() => setBulkReminderSent(false), 4000);
        } catch (error) {
            console.error('Failed to send bulk reminders', error);
            alert('Failed to send some reminders: ' + (error.response?.data?.message || error.message));
        } finally {
            setBulkSending(false);
        }
    };

    const getRiskStyle = (level) => {
        const l = (level || '').toUpperCase();
        if (l === 'HIGH') return {
            pill: 'bg-rose-50 text-rose-700 ring-rose-600/10',
            score: 'text-rose-600',
            bar: 'bg-rose-500',
            dot: 'bg-rose-500'
        };
        if (l === 'MEDIUM') return {
            pill: 'bg-amber-50 text-amber-700 ring-amber-600/10',
            score: 'text-amber-600',
            bar: 'bg-amber-500',
            dot: 'bg-amber-500'
        };
        return {
            pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
            score: 'text-emerald-600',
            bar: 'bg-emerald-500',
            dot: 'bg-emerald-500'
        };
    };

    // Compact student row component
    const StudentRow = ({ student }) => {
        const style = getRiskStyle(student.riskLevel);
        const score = student.riskScore || 0;
        const level = (student.riskLevel || 'LOW').toUpperCase();

        return (
            <div className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors border-b border-slate-100 last:border-b-0">
                {/* Avatar dot + name */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {student.name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 text-sm leading-tight truncate">{student.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-semibold truncate">
                                {student.batch?.name || 'No batch'}
                            </span>
                            {student.riskReason && student.riskReason.length > 0 && (
                                <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                                    · {student.riskReason.slice(0, 2).join(', ')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Score bar (mini) */}
                <div className="hidden md:flex items-center gap-2 w-24 flex-shrink-0">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                            className={`h-full rounded-full ${style.bar}`}
                            style={{ width: `${Math.min(score, 100)}%` }}
                        />
                    </div>
                    <span className={`text-xs font-black tabular-nums w-7 text-right flex-shrink-0 ${style.score}`}>{score}</span>
                </div>

                {/* Risk pill */}
                <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-extrabold rounded-full ring-1 ring-inset uppercase tracking-wide flex-shrink-0 ${style.pill}`}>
                    {level}
                </span>

                {/* View button */}
                <button
                    onClick={() => navigate(`/admin/students/${student._id}`)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer flex-shrink-0 ${
                        level === 'HIGH'
                            ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                            : level === 'MEDIUM'
                                ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    View
                </button>
            </div>
        );
    };

    if (loading) return (
        <DashboardLayout user={user}>
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout user={user}>
            <div className="space-y-8">
                {/* Banner */}
                <div className="p-8 rounded-3xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 opacity-10 rounded-full transform translate-x-1/3 -translate-y-1/3 blur-2xl"></div>
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-3">
                                <FaRobot className="text-indigo-200" /> AI Insights &amp; Prediction
                            </h1>
                            <p className="text-sm md:text-base text-indigo-100 font-medium max-w-2xl">
                                Advanced analytics powered by AI to predict student performance and retention risks.
                            </p>
                        </div>
                        <button
                            onClick={handleRecalculateRisk}
                            disabled={recalculating}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-indigo-700 font-bold text-xs hover:bg-indigo-50 transition-all shadow-md cursor-pointer disabled:opacity-50 flex-shrink-0"
                        >
                            <FaRobot size={14} className={recalculating ? 'animate-spin' : ''} />
                            {recalculating ? 'Analyzing Models...' : 'Run Risk Assessment'}
                        </button>
                    </div>
                </div>

                {/* Risk Overview Grid (3 counters) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="p-6 rounded-2xl bg-rose-50 border border-rose-100 relative overflow-hidden flex flex-col justify-between shadow-sm">
                        <div className="relative z-10">
                            <h3 className="text-sm font-extrabold text-rose-800 uppercase tracking-wider">High Risk</h3>
                            <p className="text-5xl font-black text-rose-900 leading-none mt-4">{highRisk.length}</p>
                            <p className="text-xs text-rose-700 font-semibold mt-3">Immediate intervention needed</p>
                        </div>
                        <FaExclamationTriangle className="absolute bottom-[-1.5rem] right-[-1.5rem] text-[9rem] text-rose-900/5 pointer-events-none" />
                    </div>

                    <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 relative overflow-hidden flex flex-col justify-between shadow-sm">
                        <div className="relative z-10">
                            <h3 className="text-sm font-extrabold text-amber-800 uppercase tracking-wider">Medium Risk</h3>
                            <p className="text-5xl font-black text-amber-900 leading-none mt-4">{mediumRisk.length}</p>
                            <p className="text-xs text-amber-700 font-semibold mt-3">Monitor progress closely</p>
                        </div>
                        <FaExclamationTriangle className="absolute bottom-[-1.5rem] right-[-1.5rem] text-[9rem] text-amber-900/5 pointer-events-none" />
                    </div>

                    <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100 relative overflow-hidden flex flex-col justify-between shadow-sm">
                        <div className="relative z-10">
                            <h3 className="text-sm font-extrabold text-emerald-800 uppercase tracking-wider">On Track</h3>
                            <p className="text-5xl font-black text-emerald-900 leading-none mt-4">{lowRisk.length}</p>
                            <p className="text-xs text-emerald-700 font-semibold mt-3">Performing well</p>
                        </div>
                        <FaCheckCircle className="absolute bottom-[-1.5rem] right-[-1.5rem] text-[9rem] text-emerald-900/5 pointer-events-none" />
                    </div>
                </div>

                {/* AI Alert */}
                {highRisk.length > 0 && (
                    <AIAlert
                        variant="danger"
                        title="Critical Attention Required"
                        message={`${highRisk.length} student(s) have been identified with high dropout risk factors. Please review their profiles and take action.`}
                    />
                )}

                {/* Risk Distribution Donut Chart */}
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-premium">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                <FaChartPie size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Student Risk Distribution</h3>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">Categorized by AI Risk Prediction Model</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Safe / On Track', value: riskBreakdown.safe || lowRisk.length, color: '#10b981' },
                                            { name: 'Medium Risk', value: riskBreakdown.medium || mediumRisk.length, color: '#f59e0b' },
                                            { name: 'High Risk', value: riskBreakdown.high || highRisk.length, color: '#ef4444' }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={65}
                                        outerRadius={95}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {[
                                            { color: '#10b981' },
                                            { color: '#f59e0b' },
                                            { color: '#ef4444' }
                                        ].map((entry, index) => (
                                            <Cell key={`cell-risk-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(val) => [`${val} students`, 'Count']} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
                                    <span className="text-sm font-bold text-slate-800">Safe / On Track</span>
                                </div>
                                <span className="text-xl font-extrabold text-emerald-700">{riskBreakdown.safe || lowRisk.length}</span>
                            </div>

                            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-3.5 h-3.5 rounded-full bg-amber-500" />
                                    <span className="text-sm font-bold text-slate-800">Medium Risk</span>
                                </div>
                                <span className="text-xl font-extrabold text-amber-700">{riskBreakdown.medium || mediumRisk.length}</span>
                            </div>

                            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-3.5 h-3.5 rounded-full bg-rose-500" />
                                    <span className="text-sm font-bold text-slate-800">High Risk</span>
                                </div>
                                <span className="text-xl font-extrabold text-rose-700">{riskBreakdown.high || highRisk.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* === Student List Section === */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-premium overflow-hidden">
                    {/* List Header: filter tabs + sort + bulk action */}
                    <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        {/* Filter Tabs */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                            {RISK_TABS.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                        activeTab === tab
                                            ? 'bg-white text-slate-800 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    {tab}
                                    {tab === 'High' && highRisk.length > 0 && (
                                        <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black">
                                            {highRisk.length}
                                        </span>
                                    )}
                                    {tab === 'Medium' && mediumRisk.length > 0 && (
                                        <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-400 text-white text-[9px] font-black">
                                            {mediumRisk.length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Sort selector */}
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                                <FaSortAmountDown size={11} className="text-slate-400" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                                >
                                    {SORT_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Bulk Send Reminder to High Risk Parents */}
                            {highRisk.length > 0 && (
                                <button
                                    onClick={handleSendBulkReminder}
                                    disabled={bulkSending}
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer shadow-sm ${
                                        bulkReminderSent
                                            ? 'bg-emerald-500'
                                            : 'bg-rose-600 hover:bg-rose-700'
                                    }`}
                                >
                                    <FaBell size={11} />
                                    {bulkSending
                                        ? 'Sending...'
                                        : bulkReminderSent
                                            ? 'Reminders Sent!'
                                            : `Alert ${highRisk.length} High Risk`}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Count label */}
                    <div className="px-5 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            {filteredInsights.length} student{filteredInsights.length !== 1 ? 's' : ''}
                            {sortBy === 'batch' ? ' grouped by batch' : ''}
                        </span>
                        {sortBy === 'batch' && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500">
                                <FaLayerGroup size={10} /> Sorted by Batch
                            </div>
                        )}
                    </div>

                    {/* Student List */}
                    {filteredInsights.length === 0 ? (
                        <div className="py-16 text-center">
                            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                                <FaUserShield size={20} />
                            </div>
                            <p className="text-sm font-bold text-slate-600">No students in this risk category</p>
                            <p className="text-xs text-slate-400 mt-1">Try switching to another filter tab.</p>
                        </div>
                    ) : sortBy === 'batch' && groupedByBatch ? (
                        // Grouped by batch view
                        <div>
                            {Object.entries(groupedByBatch).map(([batchName, students]) => (
                                <div key={batchName}>
                                    <div className="px-5 py-2.5 bg-indigo-50/60 border-b border-indigo-100 flex items-center gap-2.5">
                                        <FaLayerGroup size={11} className="text-indigo-400" />
                                        <span className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider">{batchName}</span>
                                        <span className="ml-auto text-[10px] font-bold text-indigo-400">{students.length} student{students.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    {students.map(student => (
                                        <StudentRow key={student._id} student={student} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : (
                        // Flat list view
                        <div>
                            {filteredInsights.map(student => (
                                <StudentRow key={student._id} student={student} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AIInsights;
