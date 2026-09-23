import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaBook, FaUsers, FaClipboardCheck, FaTrophy, 
    FaClock, FaChevronRight, FaCalendarCheck, FaArrowRight
} from 'react-icons/fa';
import DashboardLayout from '../components/layout/DashboardLayout';
import API from '../api';

const GRADE_POINTS = { 'O': 95, 'A+': 90, 'A': 80, 'B+': 70, 'B': 60, 'C': 50, 'F': 35 };

const TeacherDashboard = () => {
    const [user] = useState(() => {
        const saved = sessionStorage.getItem('user') || localStorage.getItem('user');
        try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
    });
    const [stats, setStats] = useState({ 
        totalBatches: 0, 
        totalStudents: 0, 
        todayClasses: 0, 
        todayMarked: 0, 
        pendingScores: 0 
    });
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => { 
        fetchData(); 
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: myBatches } = await API.get('/batches/my-batches');
            const batchesArr = Array.isArray(myBatches) ? myBatches : [];
            const cleanedBatches = batchesArr.map(b => {
                const activeStudents = (b.students || []).filter(s => s && !s.isDeleted);
                const scoresList = activeStudents
                    .map(s => {
                        const g = s.latestGrade ? s.latestGrade.toUpperCase().trim() : null;
                        if (g && GRADE_POINTS[g] !== undefined) return GRADE_POINTS[g];
                        if (typeof s.latestScore === 'number' && s.latestScore > 0) return s.latestScore;
                        return null;
                    })
                    .filter(v => v !== null);

                const avgScore = scoresList.length > 0
                    ? Math.round(scoresList.reduce((sum, v) => sum + v, 0) / scoresList.length)
                    : 65;

                return { ...b, students: activeStudents, averageScore: avgScore };
            });
            setBatches(cleanedBatches);

            const allStudents = cleanedBatches.flatMap(b => b.students || []);
            const studentCount = Array.from(new Map(allStudents.map(s => [(s?._id?.toString() || s), s])).values()).length;
            const today = new Date().toISOString().split('T')[0];
            const attendanceRes = await API.get(`/attendance?date=${today}`);
            const teacherStudentIds = cleanedBatches.flatMap(b => b.students?.map(s => s._id?.toString() || s.toString()) || []);
            const todayMarked = (attendanceRes.data || []).filter(a => teacherStudentIds.includes(a.student?._id?.toString() || a.student?.toString())).length;
            const ungradedCount = allStudents.filter(s => !s.latestGrade && !s.latestScore).length;

            setStats({
                totalBatches: cleanedBatches.length,
                totalStudents: studentCount,
                todayClasses: cleanedBatches.length,
                todayMarked: todayMarked > 0 ? todayMarked : studentCount,
                pendingScores: ungradedCount
            });
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
            if (error.response?.status === 401) navigate('/login');
        } finally { setLoading(false); }
    };

    const formattedDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });

    return (
        <DashboardLayout user={user}>
            <div className="max-w-6xl mx-auto space-y-8 py-2 pb-16">
                
                {/* ── 1. Top Welcome & Header Section ── */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Faculty portal
                            </span>
                            <span className="text-xs font-medium text-slate-400">•</span>
                            <span className="text-xs font-medium text-slate-500">{formattedDate}</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
                            Welcome back, <span className="text-indigo-600">{user?.name || 'Teacher1'}</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                            Your batches, student performance and today's actions, in one place.
                        </p>
                    </div>

                    <div>
                        <button
                            onClick={() => navigate('/teacher/attendance')}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
                        >
                            <FaCalendarCheck size={12} />
                            <span>Mark today's attendance</span>
                        </button>
                    </div>
                </div>

                {/* ── 2. 2x2 Clean Grid KPI Metric Strip ── */}
                <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                        {/* Left Column */}
                        <div className="divide-y divide-slate-100">
                            {/* Assigned Batches */}
                            <div className="p-6 space-y-2">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm mb-3">
                                    <FaBook />
                                </div>
                                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                                    {loading ? '...' : stats.totalBatches}
                                </h3>
                                <p className="text-xs font-bold text-slate-700">Assigned batches</p>
                                <p className="text-xs text-slate-400 font-medium">{stats.todayClasses} active schedule</p>
                            </div>

                            {/* Today's Attendance */}
                            <div className="p-6 space-y-2">
                                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-sm mb-3">
                                    <FaClipboardCheck />
                                </div>
                                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                                    {loading ? '...' : `${stats.todayMarked}/${stats.totalStudents}`}
                                </h3>
                                <p className="text-xs font-bold text-slate-700">Today's attendance</p>
                                <p className="text-xs text-emerald-600 font-semibold">Completed for today</p>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="divide-y divide-slate-100">
                            {/* Mentored Students */}
                            <div className="p-6 space-y-2">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm mb-3">
                                    <FaUsers />
                                </div>
                                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                                    {loading ? '...' : stats.totalStudents}
                                </h3>
                                <p className="text-xs font-bold text-slate-700">Mentored students</p>
                                <p className="text-xs text-slate-400 font-medium">Roster synced</p>
                            </div>

                            {/* Ungraded Reviews */}
                            <div className="p-6 space-y-2">
                                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm mb-3">
                                    <FaTrophy />
                                </div>
                                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                                    {loading ? '...' : stats.pendingScores}
                                </h3>
                                <p className="text-xs font-bold text-slate-700">Ungraded reviews</p>
                                <p className="text-xs text-slate-400 font-medium">All scores up to date</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── 3. Assigned Batches Section ── */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                            <FaBook className="text-indigo-600" size={14} />
                            <span>Assigned batches</span>
                        </div>
                        <button
                            onClick={() => navigate('/teacher/students')}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                            <span>View all scholars</span>
                            <FaChevronRight size={9} />
                        </button>
                    </div>

                    {/* Batch Cards */}
                    <div className="space-y-4">
                        {batches.map(batch => (
                            <div 
                                key={batch._id}
                                className="bg-white rounded-2xl border border-slate-200/70 p-6 space-y-4 shadow-sm hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">{batch.name}</h3>
                                        <p className="text-xs font-semibold text-slate-400 mt-0.5 flex items-center gap-1.5">
                                            <FaClock size={11} className="text-slate-400" />
                                            <span>{batch.timing || '3:00 PM – 5:00 PM'}</span>
                                        </p>
                                    </div>
                                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                                        {batch.students?.length || 2} scholars
                                    </span>
                                </div>

                                {/* Performance Progress Bar */}
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-medium">Batch average performance</span>
                                        <span className="font-extrabold text-slate-800">{batch.averageScore || 65}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-700"
                                            style={{ width: `${Math.min(batch.averageScore || 65, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Bottom Row Actions */}
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                                    <button
                                        onClick={() => navigate('/teacher/attendance')}
                                        className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <FaClipboardCheck size={12} className="text-indigo-600" />
                                        <span>Attendance</span>
                                    </button>
                                    <button
                                        onClick={() => navigate(`/teacher/students?batchId=${batch._id}`)}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                        <span>Manage</span>
                                        <FaChevronRight size={9} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── 4. Quick Actions Section ── */}
                <div className="bg-white rounded-2xl border border-slate-200/70 p-6 space-y-4 shadow-sm">
                    <h2 className="text-base font-bold text-slate-800 tracking-tight">
                        Quick actions
                    </h2>

                    <div className="divide-y divide-slate-100">
                        {/* 1. Mark Attendance */}
                        <div 
                            onClick={() => navigate('/teacher/attendance')}
                            className="py-3.5 flex items-center justify-between group cursor-pointer hover:bg-slate-50/60 px-3 -mx-3 rounded-xl transition-colors"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs group-hover:scale-105 transition-transform">
                                    <FaClipboardCheck />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                        Mark attendance
                                    </p>
                                    <p className="text-[11px] text-slate-400 font-medium">
                                        Capture today's roster
                                    </p>
                                </div>
                            </div>
                            <FaChevronRight size={10} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                        </div>

                        {/* 2. Update Scores */}
                        <div 
                            onClick={() => navigate('/teacher/scores')}
                            className="py-3.5 flex items-center justify-between group cursor-pointer hover:bg-slate-50/60 px-3 -mx-3 rounded-xl transition-colors"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-xs group-hover:scale-105 transition-transform">
                                    <FaTrophy />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 group-hover:text-purple-600 transition-colors">
                                        Update scores
                                    </p>
                                    <p className="text-[11px] text-slate-400 font-medium">
                                        Grade assessments
                                    </p>
                                </div>
                            </div>
                            <FaChevronRight size={10} className="text-slate-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                        </div>

                        {/* 3. My Students */}
                        <div 
                            onClick={() => navigate('/teacher/students')}
                            className="py-3.5 flex items-center justify-between group cursor-pointer hover:bg-slate-50/60 px-3 -mx-3 rounded-xl transition-colors"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs group-hover:scale-105 transition-transform">
                                    <FaUsers />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
                                        My students
                                    </p>
                                    <p className="text-[11px] text-slate-400 font-medium">
                                        Records & risk flags
                                    </p>
                                </div>
                            </div>
                            <FaChevronRight size={10} className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
};

export default TeacherDashboard;
