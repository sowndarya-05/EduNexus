import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    FaTrophy, FaChartBar, FaFileDownload, FaUserGraduate, 
    FaChevronLeft, FaCheckCircle, FaExclamationCircle, FaBookOpen
} from 'react-icons/fa';
import DashboardLayout from '../../components/layout/DashboardLayout';
import API from '../../api';

const GRADE_INFO = {
    'O':  { label: 'Outstanding', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    'A+': { label: 'Excellent',   color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    'A':  { label: 'Very Good',   color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    'B+': { label: 'Good',        color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
    'B':  { label: 'Average',     color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
    'C':  { label: 'Needs Improvement', color: 'text-amber-700 bg-amber-50 border-amber-200' },
    'F':  { label: 'Needs Attention',   color: 'text-rose-700 bg-rose-50 border-rose-200' },
};

const PerformanceDetails = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [user] = useState(() => {
        const saved = sessionStorage.getItem('user');
        try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
    });

    const [students, setStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState(location.state?.studentId || '');
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChildren();
    }, []);

    useEffect(() => {
        if (selectedStudentId) {
            fetchScores();
        }
    }, [selectedStudentId]);

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

    const fetchScores = async () => {
        try {
            setLoading(true);
            const { data } = await API.get(`/scores/student/${selectedStudentId}`);
            setScores(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch scores', error);
        } finally {
            setLoading(false);
        }
    };

    const getGradeInfo = (grade) => {
        const g = (grade || '').toUpperCase().trim();
        return GRADE_INFO[g] || { label: 'Evaluated', color: 'text-slate-700 bg-slate-50 border-slate-200' };
    };

    const selectedStudent = students.find(s => s._id === selectedStudentId) || students[0];

    // Compute average percentage across valid scores
    const validScores = scores.filter(s => typeof s.percentage === 'number' || (s.marksObtained !== undefined && s.maxMarks));
    const averageScore = validScores.length > 0
        ? Math.round(validScores.reduce((sum, s) => sum + (s.percentage !== undefined ? s.percentage : Math.round((s.marksObtained / s.maxMarks) * 100)), 0) / validScores.length)
        : null;

    const downloadReport = () => {
        try {
            const studentName = selectedStudent?.name || 'Student';
            const headers = ['Assessment', 'Subject', 'Marks Obtained', 'Max Marks', 'Percentage', 'Grade', 'Status', 'Date', 'Remark'];
            const csvRows = [
                headers.join(','),
                ...scores.map(row => [
                    JSON.stringify(row.assessment?.title || 'Academic Assessment'),
                    JSON.stringify(row.batch?.subject || 'N/A'),
                    JSON.stringify(row.marksObtained !== undefined ? row.marksObtained : 'N/A'),
                    JSON.stringify(row.maxMarks || row.assessment?.maxMarks || 100),
                    JSON.stringify(row.percentage !== undefined ? `${row.percentage}%` : 'N/A'),
                    JSON.stringify(row.grade || 'N/A'),
                    JSON.stringify(row.status || (row.grade !== 'F' ? 'PASS' : 'FAIL')),
                    JSON.stringify(new Date(row.date).toLocaleDateString()),
                    JSON.stringify(row.remark || '')
                ].join(','))
            ].join('\n');

            const blob = new Blob([csvRows], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('href', url);
            a.setAttribute('download', `${studentName}_Performance_Report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Failed to download report', error);
        }
    };

    return (
        <DashboardLayout user={user}>
            <div className="max-w-6xl mx-auto space-y-8 py-2 pb-16">
                
                {/* ── 1. Page Header with Breadcrumb & Actions ── */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm">
                    <div className="space-y-1">
                        <button
                            onClick={() => navigate('/parent')}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer mb-1"
                        >
                            <FaChevronLeft size={9} /> Back to Dashboard
                        </button>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                            Academic Performance
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                            Assessment evaluations, test grades, and teacher feedback reports.
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

                        <button
                            onClick={downloadReport}
                            disabled={scores.length === 0}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-all cursor-pointer disabled:opacity-50"
                        >
                            <FaFileDownload size={12} />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>

                {/* ── 2. Academic Summary Card ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {/* Total Assessments */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Assessments</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-2">
                            {loading ? '...' : scores.length}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">Evaluations on record</p>
                    </div>

                    {/* Average Performance */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Average Performance</p>
                        <h3 className="text-3xl font-extrabold text-indigo-600 tracking-tight mt-2">
                            {loading ? '...' : (averageScore !== null ? `${averageScore}%` : 'N/A')}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">Cumulative score</p>
                    </div>

                    {/* Latest Standing */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Latest Standing</p>
                        <h3 className="text-3xl font-extrabold text-emerald-600 tracking-tight mt-2">
                            Grade {selectedStudent?.latestGrade || 'N/A'}
                        </h3>
                        <p className="text-xs text-emerald-700 font-semibold mt-1">
                            {selectedStudent?.latestGrade ? getGradeInfo(selectedStudent.latestGrade).label : 'Pending Evaluation'}
                        </p>
                    </div>
                </div>

                {/* ── 3. Assessments Grid ── */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <FaBookOpen size={14} className="text-indigo-600" />
                            <span>Evaluation Records for {selectedStudent?.name || 'Scholar'}</span>
                        </h2>
                        <span className="text-xs text-slate-400 font-semibold">
                            {scores.length} total entries
                        </span>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {[1, 2].map(n => (
                                <div key={n} className="bg-white p-6 rounded-2xl border border-slate-200/70 animate-pulse space-y-4">
                                    <div className="h-5 bg-slate-200 rounded w-1/2"></div>
                                    <div className="h-10 bg-slate-100 rounded"></div>
                                </div>
                            ))}
                        </div>
                    ) : scores.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center space-y-3">
                            <FaChartBar size={36} className="text-slate-300 mx-auto" />
                            <h3 className="text-sm font-bold text-slate-700">No Assessment Records Yet</h3>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                Assessment results and test grades will appear here once published by the faculty mentor.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {[...scores].sort((a, b) => new Date(b.date) - new Date(a.date)).map((item, index) => {
                                const testTitle = item.assessment?.title || (item.batch?.subject ? `${item.batch.subject} Assessment` : 'Academic Evaluation');
                                const maxMarks = item.maxMarks || item.assessment?.maxMarks || 100;
                                const marksObtained = item.marksObtained;
                                const percentage = item.percentage !== undefined ? item.percentage : (marksObtained !== undefined ? Math.round((marksObtained / maxMarks) * 100) : null);
                                const status = item.status || (item.grade !== 'F' ? 'PASS' : 'FAIL');
                                const gradeStyle = getGradeInfo(item.grade);

                                return (
                                    <div 
                                        key={item._id || index}
                                        className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                                    >
                                        <div>
                                            {/* Card Top Row */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-base leading-snug">{testTitle}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                                            {item.batch?.subject || 'General'}
                                                        </span>
                                                        <span className="text-xs text-slate-400 font-medium">
                                                            {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${gradeStyle.color}`}>
                                                        Grade {item.grade || 'N/A'}
                                                    </span>
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                        status === 'PASS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                    }`}>
                                                        {status}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Score Metric Block */}
                                            {marksObtained !== undefined && (
                                                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-bold">
                                                    <span className="text-slate-500 font-medium">
                                                        Score: <strong className="text-slate-800">{marksObtained} / {maxMarks}</strong>
                                                    </span>
                                                    {percentage !== null && (
                                                        <span className="text-indigo-600 font-extrabold text-sm">{percentage}%</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Evaluation Performance Rating */}
                                            <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                                                <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Performance Level</span>
                                                <span className="font-bold text-slate-700">{gradeStyle.label}</span>
                                            </div>
                                        </div>

                                        {/* Optional Teacher Remark */}
                                        {item.remark && (
                                            <div className="p-3 bg-slate-50 rounded-xl border-l-3 border-indigo-500 text-xs text-slate-600 italic">
                                                "{item.remark}"
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
        </DashboardLayout>
    );
};

export default PerformanceDetails;
