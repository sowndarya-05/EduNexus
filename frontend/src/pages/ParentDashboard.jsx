import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaUserGraduate, FaCalendarCheck, FaChartBar, FaCreditCard, 
    FaFileInvoice, FaEnvelope, FaChevronRight, FaUserTie, 
    FaBookOpen, FaClock, FaCheckCircle, FaExclamationTriangle
} from 'react-icons/fa';
import DashboardLayout from '../components/layout/DashboardLayout';
import API from '../api';

const GRADE_LABELS = {
    'O': 'Outstanding',
    'A+': 'Excellent',
    'A': 'Very Good',
    'B+': 'Good',
    'B': 'Above Average',
    'C': 'Needs Improvement',
    'F': 'Needs Attention'
};

const ParentDashboard = () => {
    const [user] = useState(() => {
        const saved = sessionStorage.getItem('user') || localStorage.getItem('user');
        try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
    });
    const [children, setChildren] = useState([]);
    const [selectedChildId, setSelectedChildId] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => { 
        fetchChildren(); 
    }, []);

    const fetchChildren = async () => {
        try {
            setLoading(true);
            const { data } = await API.get('/students');
            const list = Array.isArray(data) ? data : [];
            setChildren(list);
            if (list.length > 0) {
                setSelectedChildId(list[0]._id);
            }
        } catch (error) {
            console.error('Failed to fetch children', error);
            if (error.response?.status === 401) navigate('/login');
        } finally { 
            setLoading(false); 
        }
    };

    const activeChild = children.find(c => c._id === selectedChildId) || children[0];

    const totalFee = activeChild?.fees?.totalAmount || activeChild?.totalFees || 0;
    const paidFee = activeChild?.fees?.paidAmount || 0;
    const pendingFee = Math.max(0, totalFee - paidFee);
    const attendancePct = activeChild?.attendancePercentage || 0;
    const latestGrade = activeChild?.latestGrade || 'N/A';
    const gradeLabel = GRADE_LABELS[latestGrade.toUpperCase().trim()] || 'Evaluation Recorded';

    const formattedDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });

    return (
        <DashboardLayout user={user}>
            <div className="max-w-6xl mx-auto space-y-8 py-2 pb-16">
                
                {/* ── 1. Minimal Header ── */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Parent Portal
                            </span>
                            <span className="text-xs font-medium text-slate-400">•</span>
                            <span className="text-xs font-medium text-slate-500">{formattedDate}</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
                            Welcome back, <span className="text-indigo-600">{user?.name?.split(' ')[0] || 'Parent'}</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium flex flex-wrap items-center gap-2">
                            <span>Scholar: <strong className="text-slate-700">{activeChild?.name || 'Your Ward'}</strong></span>
                            <span>•</span>
                            <span>Batch: <strong className="text-slate-700">{activeChild?.batch?.name || 'Class'}</strong></span>
                            <span>•</span>
                            <span>Roll ID: <strong className="text-slate-700">#{activeChild?._id?.slice(-6)?.toUpperCase()}</strong></span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {children.length > 1 && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700">
                                <FaUserGraduate className="text-indigo-600 shrink-0" />
                                <select
                                    value={selectedChildId}
                                    onChange={(e) => setSelectedChildId(e.target.value)}
                                    className="bg-transparent focus:outline-none cursor-pointer"
                                >
                                    {children.map(c => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <button
                            onClick={() => navigate('/parent/messages')}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
                        >
                            <FaEnvelope size={11} />
                            <span>Message Teacher</span>
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-6">
                        <div className="h-44 bg-white rounded-2xl border border-slate-200/70 animate-pulse"></div>
                        <div className="h-48 bg-white rounded-2xl border border-slate-200/70 animate-pulse"></div>
                    </div>
                ) : children.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-2xl">
                            <FaUserGraduate />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">No Student Records Linked</h3>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                            No student record is associated with your email ({user?.email}). Please contact school administration.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* ── 2. Unified 2×2 Clean Metric Grid ── */}
                        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                                
                                {/* Left Column: Attendance & Performance */}
                                <div className="divide-y divide-slate-100">
                                    {/* Metric 1: Attendance */}
                                    <div className="p-6 space-y-2">
                                        <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-sm mb-3">
                                            <FaCalendarCheck />
                                        </div>
                                        <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                                            {attendancePct}%
                                        </h3>
                                        <p className="text-xs font-bold text-slate-700">Attendance Rate</p>
                                        <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                            <FaCheckCircle size={10} />
                                            {attendancePct >= 75 ? 'Good participation standing' : 'Below 75% target'}
                                        </p>
                                    </div>

                                    {/* Metric 3: Academic Standing */}
                                    <div className="p-6 space-y-2">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm mb-3">
                                            <FaChartBar />
                                        </div>
                                        <h3 className="text-3xl font-extrabold text-indigo-600 tracking-tight">
                                            Grade {latestGrade}
                                        </h3>
                                        <p className="text-xs font-bold text-slate-700">Latest Academic Grade</p>
                                        <p className="text-xs text-slate-400 font-medium">{gradeLabel}</p>
                                    </div>
                                </div>

                                {/* Right Column: Tuition & Faculty */}
                                <div className="divide-y divide-slate-100">
                                    {/* Metric 2: Fee Balance */}
                                    <div className="p-6 space-y-2">
                                        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-sm mb-3">
                                            <FaCreditCard />
                                        </div>
                                        <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                                            ₹{pendingFee.toLocaleString()}
                                        </h3>
                                        <p className="text-xs font-bold text-slate-700">Outstanding Balance</p>
                                        <p className="text-xs text-slate-400 font-medium">
                                            ₹{paidFee.toLocaleString()} paid of ₹{totalFee.toLocaleString()} total
                                        </p>
                                    </div>

                                    {/* Metric 4: Assigned Mentor */}
                                    <div className="p-6 space-y-2">
                                        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm mb-3">
                                            <FaUserTie />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-800 tracking-tight truncate">
                                            {activeChild.batch?.teacher?.name || 'Class Mentor'}
                                        </h3>
                                        <p className="text-xs font-bold text-slate-700">Assigned Faculty</p>
                                        <p className="text-xs text-emerald-600 font-semibold">
                                            {activeChild.batch?.name || 'Academic Batch'} · Direct Channel
                                        </p>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* ── 3. Two Clean Academic & Financial Snapshot Cards ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Card 1: Attendance & Performance Summary */}
                            <div className="bg-white rounded-2xl border border-slate-200/70 p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                <div>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-base font-bold text-slate-800">Academic & Attendance Status</h3>
                                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                                {activeChild.batch?.name || 'General Batch'} · {activeChild.batch?.subject || 'All Subjects'}
                                            </p>
                                        </div>
                                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                                            Grade {latestGrade}
                                        </span>
                                    </div>

                                    {/* Attendance Progress Meter */}
                                    <div className="space-y-1.5 pt-4">
                                        <div className="flex justify-between items-center text-xs font-medium">
                                            <span className="text-slate-500">Attendance regular rate</span>
                                            <span className="font-bold text-slate-800">{attendancePct}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-700 ${
                                                    attendancePct >= 75 
                                                        ? 'bg-gradient-to-r from-teal-500 to-emerald-500' 
                                                        : 'bg-gradient-to-r from-amber-500 to-rose-500'
                                                }`}
                                                style={{ width: `${Math.min(attendancePct, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                                    <button
                                        onClick={() => navigate('/parent/attendance', { state: { studentId: activeChild._id } })}
                                        className="font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <FaCalendarCheck size={11} className="text-indigo-600" />
                                        <span>Attendance Log</span>
                                    </button>
                                    <button
                                        onClick={() => navigate('/parent/performance', { state: { studentId: activeChild._id } })}
                                        className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                        <span>Exam Reports</span>
                                        <FaChevronRight size={9} />
                                    </button>
                                </div>
                            </div>

                            {/* Card 2: Tuition & Financial Summary */}
                            <div className="bg-white rounded-2xl border border-slate-200/70 p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                <div>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-base font-bold text-slate-800">Tuition & Fee Account</h3>
                                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                                Institutional program registration & billing
                                            </p>
                                        </div>
                                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                                            pendingFee === 0 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>
                                            {pendingFee === 0 ? 'Settled' : 'Due'}
                                        </span>
                                    </div>

                                    {/* Fee Row Overview */}
                                    <div className="grid grid-cols-3 gap-2 pt-3 text-center">
                                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Total</p>
                                            <p className="text-xs font-extrabold text-slate-800 mt-0.5">₹{totalFee.toLocaleString()}</p>
                                        </div>
                                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Paid</p>
                                            <p className="text-xs font-extrabold text-emerald-600 mt-0.5">₹{paidFee.toLocaleString()}</p>
                                        </div>
                                        <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100">
                                            <p className="text-[10px] text-indigo-700 font-bold uppercase">Balance</p>
                                            <p className="text-xs font-extrabold text-indigo-700 mt-0.5">₹{pendingFee.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                                    <span className="text-slate-400 font-medium text-[11px]">
                                        Official receipts available
                                    </span>
                                    <button
                                        onClick={() => navigate('/parent/fees', { state: { studentId: activeChild._id } })}
                                        className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                        <span>View Statement</span>
                                        <FaChevronRight size={9} />
                                    </button>
                                </div>
                            </div>

                        </div>

                        {/* ── 4. Quick Portal Actions ── */}
                        <div className="bg-white rounded-2xl border border-slate-200/70 p-6 space-y-4 shadow-sm">
                            <h2 className="text-base font-bold text-slate-800 tracking-tight">
                                Quick actions
                            </h2>

                            <div className="divide-y divide-slate-100">
                                {/* Action 1: Attendance */}
                                <div 
                                    onClick={() => navigate('/parent/attendance', { state: { studentId: activeChild._id } })}
                                    className="py-3 flex items-center justify-between group cursor-pointer hover:bg-slate-50/60 px-3 -mx-3 rounded-xl transition-colors"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-xs group-hover:scale-105 transition-transform">
                                            <FaCalendarCheck />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                                Daily attendance history
                                            </p>
                                            <p className="text-[11px] text-slate-400 font-medium">
                                                Monthly session records & attendance status
                                            </p>
                                        </div>
                                    </div>
                                    <FaChevronRight size={10} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                                </div>

                                {/* Action 2: Performance */}
                                <div 
                                    onClick={() => navigate('/parent/performance', { state: { studentId: activeChild._id } })}
                                    className="py-3 flex items-center justify-between group cursor-pointer hover:bg-slate-50/60 px-3 -mx-3 rounded-xl transition-colors"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs group-hover:scale-105 transition-transform">
                                            <FaChartBar />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                                Academic exam reports
                                            </p>
                                            <p className="text-[11px] text-slate-400 font-medium">
                                                Test scores, evaluation remarks & CSV download
                                            </p>
                                        </div>
                                    </div>
                                    <FaChevronRight size={10} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                                </div>

                                {/* Action 3: Fees */}
                                <div 
                                    onClick={() => navigate('/parent/fees', { state: { studentId: activeChild._id } })}
                                    className="py-3 flex items-center justify-between group cursor-pointer hover:bg-slate-50/60 px-3 -mx-3 rounded-xl transition-colors"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-xs group-hover:scale-105 transition-transform">
                                            <FaCreditCard />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                                Fee ledger & receipts
                                            </p>
                                            <p className="text-[11px] text-slate-400 font-medium">
                                                Settlement history & official downloadable tax invoices
                                            </p>
                                        </div>
                                    </div>
                                    <FaChevronRight size={10} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                                </div>

                                {/* Action 4: Messages */}
                                <div 
                                    onClick={() => navigate('/parent/messages')}
                                    className="py-3 flex items-center justify-between group cursor-pointer hover:bg-slate-50/60 px-3 -mx-3 rounded-xl transition-colors"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xs group-hover:scale-105 transition-transform">
                                            <FaEnvelope />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                                Teacher communication channel
                                            </p>
                                            <p className="text-[11px] text-slate-400 font-medium">
                                                Direct private messaging with {activeChild.batch?.teacher?.name || 'faculty mentor'}
                                            </p>
                                        </div>
                                    </div>
                                    <FaChevronRight size={10} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                                </div>
                            </div>
                        </div>

                    </>
                )}

            </div>
        </DashboardLayout>
    );
};

export default ParentDashboard;
