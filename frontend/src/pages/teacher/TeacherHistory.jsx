import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    FaHistory, FaArrowLeft, FaFilter, FaFileAlt, 
    FaChevronDown, FaChevronRight, FaCalendarAlt 
} from 'react-icons/fa';
import DashboardLayout from '../../components/layout/DashboardLayout';
import API from '../../api';

/* ─── Grade configuration ─────────────────────────────────────── */
const GRADE_CONFIG = {
    O:   { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
    'A+':{ badge: 'bg-teal-50 text-teal-700 border-teal-200/60' },
    A:   { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/60' },
    'B+':{ badge: 'bg-blue-50 text-blue-700 border-blue-200/60' },
    B:   { badge: 'bg-amber-50 text-amber-700 border-amber-200/60' },
    C:   { badge: 'bg-orange-50 text-orange-700 border-orange-200/60' },
    F:   { badge: 'bg-rose-50 text-rose-700 border-rose-200/60' },
};

/* ─── helpers ──────────────────────────────────────────────────── */
const toDateKey = (record) => {
    const raw = record.date || record.createdAt;
    if (!raw) return 'Unknown';
    const d = new Date(raw);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

const formatDateKey = (key) => {
    if (key === 'Unknown') return 'Unknown Date';
    return new Date(key + 'T00:00:00').toLocaleDateString(undefined, {
        day: '2-digit', month: 'short', year: 'numeric',
    });
};

const formatTime = (record) =>
    new Date(record.createdAt || record.date).toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit',
    });

/* ─── GroupHeader ─────────────────────────────────────────────── */
const COLLAPSE_THRESHOLD = 8;

const GroupHeader = ({ dateKey, count, expanded, onToggle }) => (
    <tr
        className="cursor-pointer select-none group bg-slate-100/70 hover:bg-slate-200/60 transition-colors"
        onClick={onToggle}
    >
        <td colSpan={4} className="px-5 py-3 border-y border-slate-200/60">
            <div className="flex items-center gap-2.5">
                {count > COLLAPSE_THRESHOLD ? (
                    <span className="text-indigo-600 transition-transform duration-200"
                        style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', display: 'inline-flex' }}>
                        <FaChevronDown size={11} />
                    </span>
                ) : (
                    <span className="text-slate-400 inline-flex"><FaChevronRight size={11} /></span>
                )}

                <span className="font-bold text-slate-800 text-xs tracking-tight">
                    {formatDateKey(dateKey)}
                </span>

                <span className="ml-1 px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 text-[10px] font-bold">
                    {count} record{count !== 1 ? 's' : ''}
                </span>
            </div>
        </td>
    </tr>
);

/* ─── RecordRow ───────────────────────────────────────────────── */
const RecordRow = ({ record }) => (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
        <td className="px-6 py-3.5">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-100">
                    {(record.student?.name || 'U').charAt(0)}
                </div>
                <span className="font-bold text-slate-800 text-xs">
                    {record.student?.name || 'Unknown Scholar'}
                </span>
            </div>
        </td>

        <td className="px-6 py-3.5 text-slate-500 font-medium text-xs whitespace-nowrap">
            {formatTime(record)}
        </td>

        <td className="px-6 py-3.5">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                record.type === 'Attendance'
                    ? 'bg-blue-50 text-blue-700 border-blue-200/60'
                    : 'bg-purple-50 text-purple-700 border-purple-200/60'
            }`}>
                {record.type}
            </span>
        </td>

        <td className="px-6 py-3.5">
            {record.type === 'Attendance' ? (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                    record.status === 'Present' || record.status === 'PRESENT'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                        : 'bg-rose-50 text-rose-700 border-rose-200/60'
                }`}>
                    {record.status}
                </span>
            ) : (
                <div className="flex items-center gap-1.5">
                    {record.grade ? (
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${GRADE_CONFIG[record.grade]?.badge || 'bg-slate-100 text-slate-600'}`}>
                            Grade {record.grade}
                        </span>
                    ) : (
                        <span className="font-bold text-slate-800 text-xs">
                            {record.score}/{record.maxScore}
                        </span>
                    )}
                </div>
            )}
        </td>
    </tr>
);

/* ─── Main component ──────────────────────────────────────────── */
const TeacherHistory = () => {
    const navigate = useNavigate();
    const [user] = useState(() => {
        const saved = sessionStorage.getItem('user');
        try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
    });
    const [batches, setBatches]           = useState([]);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [history, setHistory]           = useState([]);
    const [loading, setLoading]           = useState(true);
    const location = useLocation();
    const [filter, setFilter]             = useState(location.state?.type || 'All');
    const [dateFilter, setDateFilter]     = useState('');
    const [expandedGroups, setExpandedGroups] = useState(null);

    useEffect(() => { fetchBatches(); }, []);
    useEffect(() => { if (selectedBatch) fetchHistory(); }, [selectedBatch]);

    const fetchBatches = async () => {
        try {
            const { data } = await API.get('/batches/my-batches');
            const list = Array.isArray(data) ? data : [];
            setBatches(list);
            if (list.length > 0) setSelectedBatch(list[0]._id);
        } catch (error) {
            console.error('Failed to fetch batches', error);
            if (error.response?.status === 401) navigate('/login');
        }
    };

    const fetchHistory = async () => {
        try {
            setLoading(true);
            setExpandedGroups(null);
            const [attendanceRes, scoresRes] = await Promise.all([
                API.get(`/attendance?batchId=${selectedBatch}`),
                API.get(`/scores/batch/${selectedBatch}`)
            ]);
            const combinedHistory = [
                ...(Array.isArray(attendanceRes.data) ? attendanceRes.data.map(r => ({ ...r, type: 'Attendance' })) : []),
                ...(Array.isArray(scoresRes.data) ? scoresRes.data.map(r => ({ ...r, type: 'Academic' })) : [])
            ].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
            setHistory(combinedHistory);
        } catch (error) {
            console.error('Failed to fetch history', error);
        } finally { setLoading(false); }
    };

    const filteredHistory = history.filter(item => {
        const typeMatch = filter === 'All' || item.type === filter;
        const dateMatch = dateFilter ? toDateKey(item) === dateFilter : true;
        return typeMatch && dateMatch;
    });

    const grouped = useMemo(() => {
        const map = {};
        filteredHistory.forEach(record => {
            const key = toDateKey(record);
            if (!map[key]) map[key] = [];
            map[key].push(record);
        });
        return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
    }, [filteredHistory]);

    const expandedState = useMemo(() => {
        if (expandedGroups !== null) return expandedGroups;
        const defaults = {};
        grouped.forEach(([key, records], idx) => {
            defaults[key] = idx === 0 || records.length <= COLLAPSE_THRESHOLD;
        });
        return defaults;
    }, [grouped, expandedGroups]);

    const toggleGroup = (key) => {
        setExpandedGroups(prev => ({
            ...(prev ?? expandedState),
            [key]: !(prev ?? expandedState)[key],
        }));
    };

    return (
        <DashboardLayout user={user}>
            <div className="max-w-7xl mx-auto space-y-6 pb-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                            title="Back"
                        >
                            <FaArrowLeft size={12} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                                <span className="w-2.5 h-6 bg-indigo-600 rounded-full"></span>
                                Faculty Activity Ledger
                            </h1>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                Complete timeline audit of marked attendance and assessment evaluations
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {['All', 'Attendance', 'Academic'].map(type => (
                            <button
                                key={type}
                                onClick={() => setFilter(type)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                    filter === type
                                        ? 'bg-indigo-600 text-white border-transparent shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {type === 'All' ? 'All Activity' : type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filters Strip */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                Academic Batch
                            </label>
                            <select
                                value={selectedBatch}
                                onChange={(e) => setSelectedBatch(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                            >
                                {batches.map(batch => (
                                    <option key={batch._id} value={batch._id}>
                                        {batch.name} {batch.subject ? `(${batch.subject})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                Specific Date (Optional)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                />
                                {dateFilter && (
                                    <button 
                                        onClick={() => setDateFilter('')} 
                                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table card */}
                <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/80 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-600">
                            Activity Timeline
                        </span>
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-bold border border-indigo-100">
                            {filteredHistory.length} Total Logs
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                    <th className="py-3 px-6">Scholar</th>
                                    <th className="py-3 px-6">Timestamp</th>
                                    <th className="py-3 px-6">Activity Type</th>
                                    <th className="py-3 px-6">Recorded Result</th>
                                </tr>
                            </thead>

                            <tbody className="text-xs divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="py-16 text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
                                        </td>
                                    </tr>
                                ) : grouped.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-16 text-center text-slate-400 font-semibold">
                                            No ledger logs recorded for this batch and filter selection.
                                        </td>
                                    </tr>
                                ) : grouped.map(([dateKey, records]) => {
                                    const isExpanded = (expandedGroups ?? expandedState)[dateKey] ?? true;
                                    const collapsible = records.length > COLLAPSE_THRESHOLD;

                                    return [
                                        <GroupHeader
                                            key={`hdr-${dateKey}`}
                                            dateKey={dateKey}
                                            count={records.length}
                                            expanded={isExpanded}
                                            onToggle={() => collapsible && toggleGroup(dateKey)}
                                        />,
                                        ...(isExpanded
                                            ? records.map((record, i) => (
                                                <RecordRow key={`${dateKey}-${i}`} record={record} />
                                              ))
                                            : [
                                                <tr key={`stub-${dateKey}`}>
                                                    <td colSpan={4}
                                                        className="px-6 py-2.5 text-[11px] text-slate-400 font-semibold italic bg-slate-50/40 cursor-pointer hover:text-indigo-600 transition-colors"
                                                        onClick={() => toggleGroup(dateKey)}
                                                    >
                                                        {records.length} records collapsed — click date row to view
                                                    </td>
                                                </tr>
                                              ]
                                        ),
                                    ];
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default TeacherHistory;

