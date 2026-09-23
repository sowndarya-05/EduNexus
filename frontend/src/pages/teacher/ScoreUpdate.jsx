import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaGraduationCap, FaPlus, FaTable, FaChartBar, FaCheckCircle, 
    FaSearch, FaInfoCircle, FaCheck, FaExclamationTriangle, FaTrash,
    FaArrowLeft, FaSave, FaPaperPlane, FaTimes, FaCalendarAlt,
    FaAward, FaUsers, FaArrowUp, FaArrowDown, FaFileDownload, FaChevronRight
} from 'react-icons/fa';
import DashboardLayout from '../../components/layout/DashboardLayout';
import API from '../../api';

/* ─── Grading Scale Configs ───────────────────────────────────── */
const GRADING_SYSTEMS = {
    PERCENTAGE_STANDARD: {
        label: 'Standard Percentage (A+, A, B+, B, C, D, F)',
        scale: [
            { minPercent: 90, grade: 'A+', label: 'Outstanding (90-100%)', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
            { minPercent: 80, grade: 'A',  label: 'Very Good (80-89%)',    badge: 'bg-teal-50 text-teal-700 border-teal-200/60' },
            { minPercent: 70, grade: 'B+', label: 'Good (70-79%)',         badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/60' },
            { minPercent: 60, grade: 'B',  label: 'Average (60-69%)',      badge: 'bg-blue-50 text-blue-700 border-blue-200/60' },
            { minPercent: 50, grade: 'C',  label: 'Needs Help (50-59%)',   badge: 'bg-amber-50 text-amber-700 border-amber-200/60' },
            { minPercent: 40, grade: 'D',  label: 'Pass (40-49%)',         badge: 'bg-orange-50 text-orange-700 border-orange-200/60' },
            { minPercent: 0,  grade: 'F',  label: 'Fail (0-39%)',          badge: 'bg-rose-50 text-rose-700 border-rose-200/60' },
        ]
    },
    PERCENTAGE_10_POINT: {
        label: '10-Point Scale (O, A+, A, B+, B, C, F)',
        scale: [
            { minPercent: 90, grade: 'O',  label: 'Outstanding (90-100%)', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
            { minPercent: 80, grade: 'A+', label: 'Excellent (80-89%)',    badge: 'bg-teal-50 text-teal-700 border-teal-200/60' },
            { minPercent: 70, grade: 'A',  label: 'Very Good (70-79%)',    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/60' },
            { minPercent: 60, grade: 'B+', label: 'Good (60-69%)',         badge: 'bg-blue-50 text-blue-700 border-blue-200/60' },
            { minPercent: 50, grade: 'B',  label: 'Average (50-59%)',      badge: 'bg-amber-50 text-amber-700 border-amber-200/60' },
            { minPercent: 40, grade: 'C',  label: 'Pass (40-49%)',         badge: 'bg-orange-50 text-orange-700 border-orange-200/60' },
            { minPercent: 0,  grade: 'F',  label: 'Fail (0-39%)',          badge: 'bg-rose-50 text-rose-700 border-rose-200/60' },
        ]
    }
};

const getGradeInfo = (grade) => {
    const defaultBadge = 'bg-slate-100 text-slate-700 border-slate-200';
    if (!grade) return { grade: '—', badge: defaultBadge };
    
    if (['O', 'A+'].includes(grade)) return { grade, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' };
    if (['A'].includes(grade)) return { grade, badge: 'bg-teal-50 text-teal-700 border-teal-200/60' };
    if (['B+'].includes(grade)) return { grade, badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/60' };
    if (['B'].includes(grade)) return { grade, badge: 'bg-blue-50 text-blue-700 border-blue-200/60' };
    if (['C'].includes(grade)) return { grade, badge: 'bg-amber-50 text-amber-700 border-amber-200/60' };
    if (['D'].includes(grade)) return { grade, badge: 'bg-orange-50 text-orange-700 border-orange-200/60' };
    if (['F'].includes(grade)) return { grade, badge: 'bg-rose-50 text-rose-700 border-rose-200/60' };
    return { grade, badge: defaultBadge };
};

const ScoreUpdate = () => {
    const [user] = useState(() => {
        const saved = sessionStorage.getItem('user');
        try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
    });

    const navigate = useNavigate();

    // Primary State
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [assessments, setAssessments] = useState([]);
    const [activeView, setActiveView] = useState('LIST'); // 'LIST' | 'SPREADSHEET' | 'ANALYTICS'
    const [currentAssessment, setCurrentAssessment] = useState(null);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        title: '',
        subject: '',
        maxMarks: 100,
        passingMarks: 40,
        date: new Date().toISOString().split('T')[0],
        gradingSystem: 'PERCENTAGE_STANDARD',
    });
    const [creating, setCreating] = useState(false);

    // Spreadsheet Entry State
    const [spreadsheetRoster, setSpreadsheetRoster] = useState([]);
    const [marksInputs, setMarksInputs] = useState({}); // { [studentId]: marks }
    const [remarkInputs, setRemarkInputs] = useState({}); // { [studentId]: remark }
    const [savingDraft, setSavingDraft] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [showPublishConfirm, setShowPublishConfirm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Analytics State
    const [analyticsData, setAnalyticsData] = useState(null);

    useEffect(() => {
        fetchBatches();
    }, []);

    useEffect(() => {
        if (selectedBatch) {
            fetchBatchAssessments(selectedBatch);
            // Pre-fill subject in create form
            const b = batches.find(x => x._id === selectedBatch);
            if (b) {
                setCreateForm(prev => ({ ...prev, subject: b.subject || '' }));
            }
        }
    }, [selectedBatch]);

    const showToastMessage = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchBatches = async () => {
        try {
            setLoading(true);
            const { data } = await API.get('/batches/my-batches');
            const list = Array.isArray(data) ? data : [];
            setBatches(list);
            if (list.length > 0) setSelectedBatch(list[0]._id);
        } catch (error) {
            console.error('Failed to fetch batches', error);
            if (error.response?.status === 401) navigate('/login');
        } finally { setLoading(false); }
    };

    const fetchBatchAssessments = async (batchId) => {
        try {
            setLoading(true);
            const { data } = await API.get(`/assessments/batch/${batchId}`);
            setAssessments(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch assessments', error);
        } finally { setLoading(false); }
    };

    // Load spreadsheet data for an assessment
    const handleOpenSpreadsheet = async (assessment) => {
        try {
            setLoading(true);
            const { data } = await API.get(`/assessments/${assessment._id}`);
            setCurrentAssessment(data.assessment);
            setSpreadsheetRoster(data.roster || []);
            setAnalyticsData(data.analytics || null);

            const mInit = {};
            const rInit = {};
            (data.roster || []).forEach(item => {
                mInit[item.student._id] = item.marksObtained !== '' ? item.marksObtained : '';
                rInit[item.student._id] = item.remark || '';
            });
            setMarksInputs(mInit);
            setRemarkInputs(rInit);
            setActiveView('SPREADSHEET');
        } catch (error) {
            console.error('Failed to load assessment scores', error);
            showToastMessage(error.response?.data?.message || 'Failed to load assessment', 'error');
        } finally { setLoading(false); }
    };

    // Load analytics for an assessment
    const handleOpenAnalytics = async (assessment) => {
        try {
            setLoading(true);
            const { data } = await API.get(`/assessments/${assessment._id}`);
            setCurrentAssessment(data.assessment);
            setSpreadsheetRoster(data.roster || []);
            setAnalyticsData(data.analytics || null);
            setActiveView('ANALYTICS');
        } catch (error) {
            console.error('Failed to load analytics', error);
        } finally { setLoading(false); }
    };

    // Create Assessment Handler
    const handleCreateAssessment = async (e) => {
        e.preventDefault();
        if (!createForm.title.trim()) {
            showToastMessage('Assessment title is required', 'error');
            return;
        }
        if (Number(createForm.maxMarks) <= 0) {
            showToastMessage('Maximum marks must be greater than 0', 'error');
            return;
        }
        if (Number(createForm.passingMarks) < 0 || Number(createForm.passingMarks) > Number(createForm.maxMarks)) {
            showToastMessage(`Passing marks must be between 0 and ${createForm.maxMarks}`, 'error');
            return;
        }

        try {
            setCreating(true);
            const { data: newAssessment } = await API.post('/assessments', {
                ...createForm,
                batch: selectedBatch,
            });
            showToastMessage(`Assessment "${newAssessment.title}" created successfully!`);
            setShowCreateModal(false);
            setCreateForm({
                title: '',
                subject: batches.find(x => x._id === selectedBatch)?.subject || '',
                maxMarks: 100,
                passingMarks: 40,
                date: new Date().toISOString().split('T')[0],
                gradingSystem: 'PERCENTAGE_STANDARD',
            });
            await fetchBatchAssessments(selectedBatch);
            // Open spreadsheet directly
            handleOpenSpreadsheet(newAssessment);
        } catch (error) {
            console.error('Failed to create assessment', error);
            showToastMessage(error.response?.data?.message || 'Failed to create assessment', 'error');
        } finally { setCreating(false); }
    };

    // Delete Assessment
    const handleDeleteAssessment = async (assessmentId, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this assessment and all entered scores?')) return;
        try {
            await API.delete(`/assessments/${assessmentId}`);
            showToastMessage('Assessment deleted successfully');
            if (currentAssessment?._id === assessmentId) {
                setActiveView('LIST');
                setCurrentAssessment(null);
            }
            fetchBatchAssessments(selectedBatch);
        } catch (error) {
            showToastMessage('Failed to delete assessment', 'error');
        }
    };

    // Client-side automatic live calculations per student row
    const calculateRowDerived = (studentId) => {
        const rawMarks = marksInputs[studentId];
        if (rawMarks === '' || rawMarks === undefined || rawMarks === null) {
            return { percentage: null, grade: '—', status: '—', isValid: true };
        }

        const marks = Number(rawMarks);
        const max = currentAssessment?.maxMarks || 100;
        const pass = currentAssessment?.passingMarks || 40;

        if (isNaN(marks) || marks < 0 || marks > max) {
            return { percentage: null, grade: 'Error', status: 'INVALID', isValid: false };
        }

        const percentage = Number(((marks / max) * 100).toFixed(2));
        const status = marks >= pass ? 'PASS' : 'FAIL';

        const scale = currentAssessment?.gradingScale || GRADING_SYSTEMS[currentAssessment?.gradingSystem || 'PERCENTAGE_STANDARD'].scale;
        let grade = 'F';
        for (const tier of scale) {
            if (percentage >= tier.minPercent) {
                grade = tier.grade;
                break;
            }
        }

        return { percentage, grade, status, isValid: true };
    };

    // Save Scores in Bulk (Draft)
    const handleSaveScores = async () => {
        if (!currentAssessment) return;

        // Check for any invalid marks
        const entries = [];
        for (const student of spreadsheetRoster) {
            const rawMarks = marksInputs[student.student._id];
            if (rawMarks !== '' && rawMarks !== undefined && rawMarks !== null) {
                const numMarks = Number(rawMarks);
                if (isNaN(numMarks) || numMarks < 0 || numMarks > currentAssessment.maxMarks) {
                    showToastMessage(`Invalid mark for ${student.student.name}: must be between 0 and ${currentAssessment.maxMarks}`, 'error');
                    return;
                }
                entries.push({
                    studentId: student.student._id,
                    marksObtained: numMarks,
                    remark: remarkInputs[student.student._id] || '',
                });
            }
        }

        try {
            setSavingDraft(true);
            const { data } = await API.post(`/assessments/${currentAssessment._id}/scores/bulk`, {
                scores: entries,
            });
            showToastMessage(data.message || 'Scores saved successfully in Draft mode!');
            if (data.analytics) setAnalyticsData(data.analytics);
            // Refresh assessment stats in background
            fetchBatchAssessments(selectedBatch);
        } catch (error) {
            console.error('Failed to save scores', error);
            showToastMessage(error.response?.data?.message || 'Failed to save scores', 'error');
        } finally { setSavingDraft(false); }
    };

    // Publish Results Handler
    const handlePublishResults = async () => {
        if (!currentAssessment) return;
        try {
            setPublishing(true);
            // First save latest scores
            await handleSaveScores();

            const { data } = await API.post(`/assessments/${currentAssessment._id}/publish`);
            showToastMessage(data.message || 'Assessment published and parent notifications sent!');
            setShowPublishConfirm(false);
            setCurrentAssessment(prev => ({ ...prev, status: 'PUBLISHED' }));
            fetchBatchAssessments(selectedBatch);
        } catch (error) {
            console.error('Failed to publish assessment', error);
            showToastMessage(error.response?.data?.message || 'Failed to publish assessment', 'error');
        } finally { setPublishing(false); }
    };

    // Filter spreadsheet roster by student search
    const filteredRoster = useMemo(() => {
        return spreadsheetRoster.filter(item => {
            const nameMatch = item.student.name?.toLowerCase().includes(searchTerm.toLowerCase());
            const emailMatch = item.student.email?.toLowerCase().includes(searchTerm.toLowerCase());
            return nameMatch || emailMatch;
        });
    }, [spreadsheetRoster, searchTerm]);

    // Live spreadsheet calculated metrics
    const liveCalculatedStats = useMemo(() => {
        if (!currentAssessment || spreadsheetRoster.length === 0) return { evaluated: 0, pass: 0, fail: 0, avg: 0 };
        let count = 0;
        let sumPct = 0;
        let pass = 0;

        spreadsheetRoster.forEach(item => {
            const d = calculateRowDerived(item.student._id);
            if (d.percentage !== null && d.isValid) {
                count++;
                sumPct += d.percentage;
                if (d.status === 'PASS') pass++;
            }
        });

        return {
            evaluated: count,
            pass,
            fail: count - pass,
            avg: count > 0 ? Number((sumPct / count).toFixed(1)) : 0,
            passRate: count > 0 ? Number(((pass / count) * 100).toFixed(1)) : 0,
        };
    }, [marksInputs, spreadsheetRoster, currentAssessment]);

    return (
        <DashboardLayout user={user}>
            <div className="max-w-7xl mx-auto space-y-6 pb-12">
                {/* Toast Alert */}
                {toast && (
                    <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-lg transition-all animate-bounce ${
                        toast.type === 'error' 
                            ? 'bg-rose-50 border-rose-200 text-rose-800' 
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                        <div className="flex items-center gap-2">
                            {toast.type === 'error' ? <FaExclamationTriangle size={14} /> : <FaCheckCircle size={14} />}
                            <span>{toast.msg}</span>
                        </div>
                        <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                            <FaTimes />
                        </button>
                    </div>
                )}

                {/* Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {activeView !== 'LIST' && (
                            <button
                                onClick={() => setActiveView('LIST')}
                                className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                                title="Back to Assessments"
                            >
                                <FaArrowLeft size={12} />
                            </button>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                                <span className="w-2.5 h-6 bg-purple-600 rounded-full"></span>
                                {activeView === 'LIST' && 'Assessment & Score Center'}
                                {activeView === 'SPREADSHEET' && `${currentAssessment?.title} — Score Spreadsheet`}
                                {activeView === 'ANALYTICS' && `${currentAssessment?.title} — Class Performance`}
                            </h1>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                {activeView === 'LIST' && 'Create tests, enter marks in bulk, review class analytics, and notify parents upon publication.'}
                                {activeView === 'SPREADSHEET' && `Enter marks obtained out of ${currentAssessment?.maxMarks}. Percentage, grade, and pass/fail are calculated automatically.`}
                                {activeView === 'ANALYTICS' && 'Class average score, pass rate, and visual grade distribution analysis.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {activeView === 'LIST' && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
                            >
                                <FaPlus size={10} /> Create Assessment
                            </button>
                        )}

                        {activeView === 'SPREADSHEET' && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleOpenAnalytics(currentAssessment)}
                                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition-all cursor-pointer"
                                >
                                    <FaChartBar size={11} className="text-indigo-600" /> Analytics
                                </button>
                                <button
                                    onClick={handleSaveScores}
                                    disabled={savingDraft}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                                >
                                    <FaSave size={11} className="text-slate-500" /> {savingDraft ? 'Saving...' : 'Save Draft'}
                                </button>
                                <button
                                    onClick={() => setShowPublishConfirm(true)}
                                    disabled={publishing}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                                >
                                    <FaPaperPlane size={10} /> {currentAssessment?.status === 'PUBLISHED' ? 'Update & Re-Publish' : 'Publish Results'}
                                </button>
                            </div>
                        )}

                        {activeView === 'ANALYTICS' && (
                            <button
                                onClick={() => handleOpenSpreadsheet(currentAssessment)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
                            >
                                <FaTable size={11} /> Edit Scores
                            </button>
                        )}
                    </div>
                </div>

                {/* ─── VIEW 1: ASSESSMENTS LIST ─────────────────────────────── */}
                {activeView === 'LIST' && (
                    <div className="space-y-6">
                        {/* Batch Selector Bar */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Academic Batch:
                                </label>
                                <select
                                    value={selectedBatch}
                                    onChange={(e) => setSelectedBatch(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                >
                                    {batches.map(b => (
                                        <option key={b._id} value={b._id}>{b.name} {b.subject ? `(${b.subject})` : ''}</option>
                                    ))}
                                </select>
                            </div>

                            <span className="text-xs font-semibold text-slate-500">
                                {assessments.length} assessment{assessments.length !== 1 ? 's' : ''} configured
                            </span>
                        </div>

                        {/* Assessments Grid */}
                        {loading ? (
                            <div className="py-20 text-center space-y-3">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600 mx-auto"></div>
                                <p className="text-xs font-semibold text-slate-400">Loading assessments...</p>
                            </div>
                        ) : assessments.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
                                <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto text-2xl">
                                    <FaGraduationCap />
                                </div>
                                <h3 className="text-base font-bold text-slate-800">No Assessments Created Yet</h3>
                                <p className="text-xs text-slate-500 max-w-md mx-auto">
                                    Create your first unit test, quiz, or mock examination for this batch to evaluate student marks with automatic grading.
                                </p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all mt-2"
                                >
                                    <FaPlus size={10} /> Create New Assessment
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {assessments.map(assessment => {
                                    const isPublished = assessment.status === 'PUBLISHED';
                                    const evaluatedPct = assessment.totalBatchStudents > 0 
                                        ? Math.round((assessment.evaluatedCount / assessment.totalBatchStudents) * 100)
                                        : 0;

                                    return (
                                        <div 
                                            key={assessment._id}
                                            className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                                        >
                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-600 mb-1.5">
                                                            {assessment.subject || 'Subject'}
                                                        </span>
                                                        <h3 className="font-extrabold text-slate-800 text-base leading-tight">
                                                            {assessment.title}
                                                        </h3>
                                                        <p className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                                                            <FaCalendarAlt size={10} />
                                                            {new Date(assessment.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    </div>

                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${
                                                        isPublished 
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70' 
                                                            : 'bg-amber-50 text-amber-700 border-amber-200/70'
                                                    }`}>
                                                        {assessment.status}
                                                    </span>
                                                </div>

                                                {/* Test Specs */}
                                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                                                    <div className="bg-slate-50 p-2.5 rounded-xl">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Max Marks</p>
                                                        <p className="font-extrabold text-slate-800 text-sm mt-0.5">{assessment.maxMarks}</p>
                                                    </div>
                                                    <div className="bg-slate-50 p-2.5 rounded-xl">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Pass Marks</p>
                                                        <p className="font-extrabold text-slate-800 text-sm mt-0.5">{assessment.passingMarks}</p>
                                                    </div>
                                                </div>

                                                {/* Evaluation Progress */}
                                                <div className="space-y-1.5 pt-1">
                                                    <div className="flex justify-between text-[11px] font-bold">
                                                        <span className="text-slate-500">Evaluated Scholars</span>
                                                        <span className="text-slate-800">{assessment.evaluatedCount} / {assessment.totalBatchStudents} ({evaluatedPct}%)</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                        <div 
                                                            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                                                            style={{ width: `${Math.min(evaluatedPct, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>

                                                {/* Quick Metrics */}
                                                {assessment.evaluatedCount > 0 && (
                                                    <div className="flex items-center justify-between text-xs font-semibold pt-2 text-slate-600">
                                                        <span>Class Avg: <strong className="text-slate-800">{assessment.averagePercentage}%</strong></span>
                                                        <span>Pass Rate: <strong className="text-emerald-700">{assessment.passRate}%</strong></span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-slate-100">
                                                <button
                                                    onClick={() => handleOpenSpreadsheet(assessment)}
                                                    className="col-span-2 py-2 px-3 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                                >
                                                    <FaTable size={11} /> Enter Scores
                                                </button>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleOpenAnalytics(assessment)}
                                                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center"
                                                        title="View Class Performance"
                                                    >
                                                        <FaChartBar size={12} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteAssessment(assessment._id, e)}
                                                        className="py-2 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center"
                                                        title="Delete Assessment"
                                                    >
                                                        <FaTrash size={11} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── VIEW 2: SPREADSHEET SCORE ENTRY ───────────────────────── */}
                {activeView === 'SPREADSHEET' && currentAssessment && (
                    <div className="space-y-5">
                        {/* Assessment Specs Bar & Legend */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex flex-wrap items-center gap-3 text-xs">
                                    <span className="px-3 py-1 bg-purple-50 text-purple-700 font-extrabold rounded-lg border border-purple-100">
                                        Max Marks: {currentAssessment.maxMarks}
                                    </span>
                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-extrabold rounded-lg border border-emerald-100">
                                        Passing Marks: {currentAssessment.passingMarks}
                                    </span>
                                    <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg">
                                        Grading: {GRADING_SYSTEMS[currentAssessment.gradingSystem || 'PERCENTAGE_STANDARD']?.label}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 text-xs font-bold">
                                    <span>Evaluated: <strong className="text-indigo-600">{liveCalculatedStats.evaluated} / {spreadsheetRoster.length}</strong></span>
                                    <span>Class Avg: <strong className="text-slate-800">{liveCalculatedStats.avg}%</strong></span>
                                    <span>Pass Rate: <strong className="text-emerald-700">{liveCalculatedStats.passRate}%</strong></span>
                                </div>
                            </div>

                            {/* Search Filter */}
                            <div className="relative">
                                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                                <input
                                    type="text"
                                    placeholder="Search student by name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Spreadsheet Table */}
                        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80 sticky top-0 z-10">
                                            <th className="py-3 px-5">#</th>
                                            <th className="py-3 px-5">Scholar</th>
                                            <th className="py-3 px-5 w-44">Marks Obtained (/{currentAssessment.maxMarks})</th>
                                            <th className="py-3 px-5 text-center">Percentage</th>
                                            <th className="py-3 px-5 text-center">Grade</th>
                                            <th className="py-3 px-5 text-center">Status</th>
                                            <th className="py-3 px-5">Remark (Optional)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {filteredRoster.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                                                    No matching students found in this batch roster.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredRoster.map((item, index) => {
                                                const sId = item.student._id;
                                                const derived = calculateRowDerived(sId);
                                                const currentMark = marksInputs[sId];
                                                const gradeBadge = getGradeInfo(derived.grade).badge;

                                                return (
                                                    <tr key={sId} className="hover:bg-slate-50/60 transition-colors">
                                                        <td className="py-3.5 px-5 font-bold text-slate-400 text-xs">
                                                            {index + 1}
                                                        </td>

                                                        <td className="py-3.5 px-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                                                                    {item.student.name?.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-800 text-xs">{item.student.name}</p>
                                                                    <p className="text-[10px] text-slate-400 font-medium">{item.student.email || 'No email'}</p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Marks Input */}
                                                        <td className="py-3.5 px-5">
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={currentAssessment.maxMarks}
                                                                    step="any"
                                                                    placeholder="Enter marks"
                                                                    value={currentMark !== undefined ? currentMark : ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setMarksInputs(prev => ({ ...prev, [sId]: val }));
                                                                    }}
                                                                    className={`w-full py-1.5 px-3 bg-slate-50 border rounded-xl text-xs font-extrabold focus:outline-none focus:ring-2 ${
                                                                        !derived.isValid 
                                                                            ? 'border-rose-400 text-rose-700 bg-rose-50/50 focus:ring-rose-500' 
                                                                            : 'border-slate-200 text-slate-800 focus:ring-indigo-500'
                                                                    }`}
                                                                />
                                                                {!derived.isValid && (
                                                                    <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                                                                        Must be 0–{currentAssessment.maxMarks}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Auto-Calculated Percentage */}
                                                        <td className="py-3.5 px-5 text-center font-extrabold text-slate-800">
                                                            {derived.percentage !== null ? `${derived.percentage}%` : '—'}
                                                        </td>

                                                        {/* Auto-Calculated Grade */}
                                                        <td className="py-3.5 px-5 text-center">
                                                            {derived.grade !== '—' && derived.grade !== 'Error' ? (
                                                                <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-extrabold border ${gradeBadge}`}>
                                                                    {derived.grade}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300 font-bold">—</span>
                                                            )}
                                                        </td>

                                                        {/* Auto-Calculated Pass / Fail Status */}
                                                        <td className="py-3.5 px-5 text-center">
                                                            {derived.status === 'PASS' && (
                                                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                                                    PASS
                                                                </span>
                                                            )}
                                                            {derived.status === 'FAIL' && (
                                                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200/70">
                                                                    FAIL
                                                                </span>
                                                            )}
                                                            {derived.status === '—' && (
                                                                <span className="text-slate-300 font-bold">—</span>
                                                            )}
                                                        </td>

                                                        {/* Remark */}
                                                        <td className="py-3.5 px-5">
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. Well done"
                                                                value={remarkInputs[sId] || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setRemarkInputs(prev => ({ ...prev, [sId]: val }));
                                                                }}
                                                                className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Spreadsheet Footer Actions */}
                            <div className="p-4 bg-slate-50/90 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                                <p className="text-xs text-slate-500 font-medium">
                                    💡 <strong>Draft mode:</strong> Clicking "Save Draft" saves marks without notifying parents. Click "Publish Results" to finalize scores and send in-app parent notifications.
                                </p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleSaveScores}
                                        disabled={savingDraft}
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        {savingDraft ? 'Saving...' : 'Save Draft Scores'}
                                    </button>
                                    <button
                                        onClick={() => setShowPublishConfirm(true)}
                                        disabled={publishing}
                                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        {publishing ? 'Publishing...' : 'Publish Results →'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── VIEW 3: CLASS PERFORMANCE ANALYTICS ───────────────────── */}
                {activeView === 'ANALYTICS' && currentAssessment && analyticsData && (
                    <div className="space-y-6">
                        {/* 4 Summary KPI Metric Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Class Average</p>
                                <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-2">{analyticsData.averagePercentage}%</h3>
                                <p className="text-xs font-medium text-slate-500 mt-2 pt-2 border-t border-slate-100">
                                    Average marks: <strong className="text-slate-700">{analyticsData.averageMarks}</strong> / {currentAssessment.maxMarks}
                                </p>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Highest Score</p>
                                <h3 className="text-3xl font-extrabold text-emerald-600 tracking-tight mt-2">{analyticsData.highestPercentage}%</h3>
                                <p className="text-xs font-medium text-slate-500 mt-2 pt-2 border-t border-slate-100">
                                    Top score: <strong className="text-emerald-700">{analyticsData.highestScore}</strong> / {currentAssessment.maxMarks}
                                </p>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Lowest Score</p>
                                <h3 className="text-3xl font-extrabold text-rose-600 tracking-tight mt-2">{analyticsData.lowestPercentage}%</h3>
                                <p className="text-xs font-medium text-slate-500 mt-2 pt-2 border-t border-slate-100">
                                    Bottom score: <strong className="text-rose-700">{analyticsData.lowestScore}</strong> / {currentAssessment.maxMarks}
                                </p>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pass Rate</p>
                                <h3 className="text-3xl font-extrabold text-indigo-600 tracking-tight mt-2">{analyticsData.passRate}%</h3>
                                <p className="text-xs font-medium text-slate-500 mt-2 pt-2 border-t border-slate-100">
                                    <strong className="text-emerald-700">{analyticsData.passCount} passed</strong> • <strong className="text-rose-700">{analyticsData.failCount} failed</strong>
                                </p>
                            </div>
                        </div>

                        {/* Performance Distribution Visual Chart */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm space-y-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-slate-800">Performance Distribution</h3>
                                    <p className="text-xs text-slate-400 font-medium">Dynamic breakdown of scholars across score percentage brackets</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                                    {analyticsData.totalEvaluated} Scholars Evaluated
                                </span>
                            </div>

                            <div className="space-y-3.5 pt-2">
                                {analyticsData.performanceDistribution.map((band, idx) => (
                                    <div key={idx} className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-slate-700">{band.range}</span>
                                            <span className="text-slate-500">
                                                {band.count} scholar{band.count !== 1 ? 's' : ''} ({band.percentage}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    idx === 0 ? 'bg-emerald-500' :
                                                    idx === 1 ? 'bg-teal-500' :
                                                    idx === 2 ? 'bg-indigo-500' :
                                                    idx === 3 ? 'bg-amber-500' : 'bg-rose-500'
                                                }`}
                                                style={{ width: `${Math.max(band.percentage, band.count > 0 ? 4 : 0)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Student Rank Roster */}
                        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                                <h3 className="font-bold text-slate-800 text-sm">Scholars Assessment Ranking</h3>
                                <button
                                    onClick={() => handleOpenSpreadsheet(currentAssessment)}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                                >
                                    Modify Marks in Spreadsheet →
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                            <th className="py-3 px-6">Scholar</th>
                                            <th className="py-3 px-6 text-center">Marks Obtained</th>
                                            <th className="py-3 px-6 text-center">Percentage</th>
                                            <th className="py-3 px-6 text-center">Grade</th>
                                            <th className="py-3 px-6 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {spreadsheetRoster
                                            .filter(item => item.marksObtained !== '' && item.marksObtained !== null)
                                            .sort((a, b) => Number(b.marksObtained) - Number(a.marksObtained))
                                            .map((item) => (
                                                <tr key={item.student._id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-3.5 px-6 font-bold text-slate-800">
                                                        {item.student.name}
                                                    </td>
                                                    <td className="py-3.5 px-6 text-center font-extrabold text-slate-800">
                                                        {item.marksObtained} / {currentAssessment.maxMarks}
                                                    </td>
                                                    <td className="py-3.5 px-6 text-center font-extrabold text-slate-800">
                                                        {item.percentage}%
                                                    </td>
                                                    <td className="py-3.5 px-6 text-center">
                                                        <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-extrabold border ${getGradeInfo(item.grade).badge}`}>
                                                            {item.grade}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-6 text-center">
                                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                            item.status === 'PASS' 
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        }`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── CREATE ASSESSMENT MODAL ───────────────────────────────────── */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-100 shadow-2xl relative space-y-6">
                        <button 
                            onClick={() => setShowCreateModal(false)} 
                            className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                            <FaTimes size={16} />
                        </button>

                        <div>
                            <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                <span className="w-2.5 h-5 bg-indigo-600 rounded-full"></span>
                                Create New Assessment
                            </h3>
                            <p className="text-xs text-slate-400 font-medium mt-1">
                                Configure test parameters. Maximum marks can be customized (e.g. 20, 50, 100, 200).
                            </p>
                        </div>

                        <form onSubmit={handleCreateAssessment} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Test Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Java Unit Test 1, DSA Mock Exam"
                                    value={createForm.title}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Batch *
                                    </label>
                                    <select
                                        value={selectedBatch}
                                        onChange={(e) => setSelectedBatch(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    >
                                        {batches.map(b => (
                                            <option key={b._id} value={b._id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Subject
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Java, Data Structures"
                                        value={createForm.subject}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, subject: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Maximum Marks *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        placeholder="e.g. 100, 50, 20"
                                        value={createForm.maxMarks}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, maxMarks: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Passing Marks *
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={createForm.maxMarks}
                                        required
                                        placeholder="e.g. 40, 20, 8"
                                        value={createForm.passingMarks}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, passingMarks: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Assessment Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={createForm.date}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, date: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Grading System
                                    </label>
                                    <select
                                        value={createForm.gradingSystem}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, gradingSystem: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    >
                                        <option value="PERCENTAGE_STANDARD">Standard (A+, A, B+, B, C, D, F)</option>
                                        <option value="PERCENTAGE_10_POINT">10-Point (O, A+, A, B+, B, C, F)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                                >
                                    {creating ? 'Creating...' : 'Create & Open Spreadsheet →'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── PUBLISH CONFIRMATION MODAL ─────────────────────────────────── */}
            {showPublishConfirm && currentAssessment && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-100 shadow-2xl relative space-y-5 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
                            <FaPaperPlane />
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Publish Assessment Results?</h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                Publishing will finalize the results for <strong>{currentAssessment.title}</strong> and automatically send in-app messages to linked parent accounts.
                            </p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl text-xs text-left space-y-2 border border-slate-100">
                            <div className="flex justify-between font-bold">
                                <span className="text-slate-500">Evaluated Scholars:</span>
                                <span className="text-slate-800">{liveCalculatedStats.evaluated}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span className="text-slate-500">Class Average:</span>
                                <span className="text-slate-800">{liveCalculatedStats.avg}%</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span className="text-slate-500">Pass Rate:</span>
                                <span className="text-emerald-700">{liveCalculatedStats.passRate}%</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowPublishConfirm(false)}
                                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handlePublishResults}
                                disabled={publishing}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                            >
                                {publishing ? 'Publishing & Notifying...' : 'Confirm & Publish'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default ScoreUpdate;
