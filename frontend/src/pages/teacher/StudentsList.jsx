import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    FaUsers, FaHistory, FaArrowLeft, FaClipboardCheck, 
    FaEnvelope, FaSearch, FaFilter, FaTimes, FaGraduationCap,
    FaCheckCircle, FaExclamationTriangle, FaUserGraduate, FaExternalLinkAlt
} from 'react-icons/fa';
import DashboardLayout from '../../components/layout/DashboardLayout';
import API from '../../api';

const GRADE_CONFIG = {
    O:   { label: 'Outstanding',  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
    'A+':{ label: 'Excellent',    badge: 'bg-teal-50 text-teal-700 border-teal-200/60' },
    A:   { label: 'Very Good',    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/60' },
    'B+':{ label: 'Good',         badge: 'bg-blue-50 text-blue-700 border-blue-200/60' },
    B:   { label: 'Average',      badge: 'bg-amber-50 text-amber-700 border-amber-200/60' },
    C:   { label: 'Needs Help',   badge: 'bg-orange-50 text-orange-700 border-orange-200/60' },
    F:   { label: 'Unstable',     badge: 'bg-rose-50 text-rose-700 border-rose-200/60' },
};

const StudentsList = () => {
    const [user] = useState(() => {
        const saved = sessionStorage.getItem('user');
        try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
    });
    const [students, setStudents] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRiskFilter, setSelectedRiskFilter] = useState('ALL');
    const [selectedBatchFilter, setSelectedBatchFilter] = useState('');
    const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();

    const queryParams = new URLSearchParams(location.search);
    const urlBatchId = queryParams.get('batchId');

    useEffect(() => {
        if (urlBatchId) setSelectedBatchFilter(urlBatchId);
        fetchData();
    }, [urlBatchId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: myBatches } = await API.get('/batches/my-batches');
            const batchList = Array.isArray(myBatches) ? myBatches : [];
            setBatches(batchList);

            const allStudents = batchList.flatMap(b => (b.students || []).map(s => ({
                ...s,
                batchId: b._id,
                batchName: b.name,
                batchSubject: b.subject
            }))).filter(s => s && !s.isDeleted);

            const uniqueStudentsMap = new Map();
            allStudents.forEach(s => {
                const id = s._id?.toString() || s._id;
                if (!uniqueStudentsMap.has(id)) {
                    uniqueStudentsMap.set(id, s);
                }
            });

            setStudents(Array.from(uniqueStudentsMap.values()));
        } catch (error) {
            console.error('Failed to fetch students', error);
            if (error.response?.status === 401) navigate('/login');
        } finally { setLoading(false); }
    };

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesSearch = 
                s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.batchName?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesBatch = selectedBatchFilter ? s.batchId === selectedBatchFilter : true;
            const matchesRisk = selectedRiskFilter === 'ALL' ? true : (s.riskLevel || 'LOW').toUpperCase() === selectedRiskFilter;

            return matchesSearch && matchesBatch && matchesRisk;
        });
    }, [students, searchTerm, selectedBatchFilter, selectedRiskFilter]);

    const topPerformersCount = useMemo(() => {
        return students.filter(s => {
            const hasTopGrade = ['O', 'A+', 'A'].includes(s?.latestGrade);
            const hasGoodAttendance = (s?.attendancePercentage || 0) >= 85;
            return hasTopGrade || hasGoodAttendance;
        }).length;
    }, [students]);

    const highRiskCount = useMemo(() => {
        return students.filter(s => (s?.riskLevel || '').toUpperCase() === 'HIGH').length;
    }, [students]);

    return (
        <DashboardLayout user={user}>
            <div className="max-w-7xl mx-auto space-y-6 pb-12">
                {/* Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {selectedBatchFilter && (
                            <button
                                onClick={() => { setSelectedBatchFilter(''); navigate('/teacher/students'); }}
                                className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                                title="Clear Batch Filter"
                            >
                                <FaArrowLeft size={12} />
                            </button>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                                <span className="w-2.5 h-6 bg-emerald-600 rounded-full"></span>
                                Scholar Directory
                            </h1>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                {selectedBatchFilter 
                                    ? `Showing scholars in ${batches.find(b => b._id === selectedBatchFilter)?.name || 'Selected Batch'}`
                                    : 'Manage and monitor all active students across your assigned academic batches'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/teacher/scores')}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition-all cursor-pointer"
                        >
                            <FaGraduationCap size={12} /> Grade Center
                        </button>
                        <button
                            onClick={() => navigate('/teacher/messages')}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
                        >
                            <FaEnvelope size={11} /> Message Parents
                        </button>
                    </div>
                </div>

                {/* 3 Summary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Scholars</p>
                                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-2">{students.length}</h3>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
                                <FaUsers />
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 text-xs font-medium text-slate-500">
                            Across <strong className="text-slate-700">{batches.length}</strong> academic batches
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">High Performers</p>
                                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-2">{topPerformersCount}</h3>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
                                <FaCheckCircle />
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 text-xs font-medium text-slate-500">
                            <span className="text-emerald-700 font-semibold">Grade A/A+/O or 85%+ attendance</span>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">AI Risk Attention</p>
                                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-2">{highRiskCount}</h3>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg">
                                <FaExclamationTriangle />
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 text-xs font-medium text-slate-500">
                            <span className={highRiskCount > 0 ? "text-rose-700 font-semibold" : "text-slate-400"}>
                                {highRiskCount > 0 ? 'Critical intervention recommended' : 'No critical flags detected'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="relative lg:col-span-2">
                            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                            <input
                                type="text"
                                placeholder="Search scholar by name, email or batch..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <select
                                value={selectedBatchFilter}
                                onChange={(e) => setSelectedBatchFilter(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                            >
                                <option value="">All Batches ({batches.length})</option>
                                {batches.map(b => (
                                    <option key={b._id} value={b._id}>{b.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <select
                                value={selectedRiskFilter}
                                onChange={(e) => setSelectedRiskFilter(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                            >
                                <option value="ALL">All Risk Levels</option>
                                <option value="HIGH">High Risk Only</option>
                                <option value="MEDIUM">Medium Risk</option>
                                <option value="LOW">Low Risk</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Scholars Table Section */}
                <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="py-16 text-center space-y-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600 mx-auto"></div>
                            <p className="text-xs font-semibold text-slate-400">Loading scholar records...</p>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 space-y-2">
                            <FaUserGraduate size={32} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-sm font-bold text-slate-600">No scholars match the filters</p>
                            <p className="text-xs text-slate-400">Try clearing search terms or changing batch filters.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                        <th className="py-3.5 px-5">Scholar</th>
                                        <th className="py-3.5 px-5">Batch</th>
                                        <th className="py-3.5 px-5">Academic Grade</th>
                                        <th className="py-3.5 px-5">Attendance</th>
                                        <th className="py-3.5 px-5">AI Risk Flag</th>
                                        <th className="py-3.5 px-5 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {filteredStudents.map((student) => {
                                        const grade = student.latestGrade || '';
                                        const gradeInfo = GRADE_CONFIG[grade] || { label: 'Ungraded', badge: 'bg-slate-100 text-slate-600' };
                                        const risk = (student.riskLevel || 'LOW').toUpperCase();

                                        return (
                                            <tr key={student._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 px-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                                                            {student.name ? student.name.charAt(0).toUpperCase() : '?'}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800 text-sm leading-tight">{student.name}</p>
                                                            <p className="text-[11px] text-slate-400 font-medium">{student.email || 'No email'}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-4 px-5">
                                                    <span className="font-semibold text-slate-700">{student.batchName || 'Unassigned'}</span>
                                                </td>

                                                <td className="py-4 px-5">
                                                    {grade ? (
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${gradeInfo.badge}`}>
                                                            {grade} • {gradeInfo.label}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 font-medium text-xs">Not recorded</span>
                                                    )}
                                                </td>

                                                <td className="py-4 px-5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full ${
                                                                    (student.attendancePercentage || 0) >= 75 ? 'bg-emerald-500' : 'bg-rose-500'
                                                                }`}
                                                                style={{ width: `${Math.min(student.attendancePercentage || 0, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="font-extrabold text-slate-700 text-xs">
                                                            {student.attendancePercentage !== undefined ? `${student.attendancePercentage}%` : '—'}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="py-4 px-5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                                        risk === 'HIGH'
                                                            ? 'bg-rose-50 text-rose-700 border-rose-200/60'
                                                            : risk === 'MEDIUM'
                                                                ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                                    }`}>
                                                        {risk} Risk
                                                    </span>
                                                    {student.riskReason && student.riskReason.length > 0 && (
                                                        <p className="text-[10px] text-slate-400 font-medium mt-1 truncate max-w-[140px]" title={student.riskReason[0]}>
                                                            {student.riskReason[0]}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="py-4 px-5 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => setSelectedStudentForModal(student)}
                                                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                                                        >
                                                            Profile
                                                        </button>
                                                        <button
                                                            onClick={() => navigate('/teacher/history')}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                                            title="View Activity Ledger"
                                                        >
                                                            <FaHistory size={12} />
                                                        </button>
                                                    </div>
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

            {/* Student Profile Quick View Modal */}
            {selectedStudentForModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-100 shadow-2xl relative space-y-6">
                        <button 
                            onClick={() => setSelectedStudentForModal(null)} 
                            className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                            <FaTimes size={16} />
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
                                {selectedStudentForModal.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 tracking-tight">{selectedStudentForModal.name}</h3>
                                <p className="text-xs text-slate-400 font-medium">{selectedStudentForModal.email || 'No email registered'}</p>
                                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700">
                                    {selectedStudentForModal.batchName}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Attendance</p>
                                <h4 className="text-2xl font-extrabold text-slate-800 mt-1">
                                    {selectedStudentForModal.attendancePercentage !== undefined ? `${selectedStudentForModal.attendancePercentage}%` : '—'}
                                </h4>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Latest Grade</p>
                                <h4 className="text-2xl font-extrabold text-indigo-600 mt-1">
                                    {selectedStudentForModal.latestGrade || '—'}
                                </h4>
                            </div>
                        </div>

                        {selectedStudentForModal.riskReason && selectedStudentForModal.riskReason.length > 0 && (
                            <div className="p-4 bg-amber-50/70 border border-amber-200/70 rounded-2xl space-y-1">
                                <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                    <FaExclamationTriangle size={11} /> AI Evaluation Remarks
                                </p>
                                <ul className="text-xs text-amber-800 list-disc list-inside space-y-0.5 font-medium pt-1">
                                    {selectedStudentForModal.riskReason.map((r, idx) => (
                                        <li key={idx}>{r}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setSelectedStudentForModal(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedStudentForModal(null);
                                    navigate('/teacher/messages');
                                }}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                            >
                                Message Parent →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default StudentsList;

