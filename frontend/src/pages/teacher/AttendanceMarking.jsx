import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaCheck, FaTimes, FaCalendarAlt, FaUsers, FaHistory, 
    FaSearch, FaCheckDouble, FaSave, FaExclamationTriangle, FaCheckCircle
} from 'react-icons/fa';
import DashboardLayout from '../../components/layout/DashboardLayout';
import API from '../../api';

const AttendanceMarking = () => {
    const [user] = useState(() => {
        const saved = sessionStorage.getItem('user');
        try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
    });
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [searchTerm, setSearchTerm] = useState('');

    const getLocalDate = () => {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    };
    const [date, setDate] = useState(getLocalDate());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
    const navigate = useNavigate();

    useEffect(() => { fetchBatches(); }, []);
    useEffect(() => { if (selectedBatch && date) fetchStudentsAndAttendance(); }, [selectedBatch, date]);

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

    const fetchStudentsAndAttendance = async () => {
        try {
            setLoading(true);
            const [studentsRes, attendanceRes] = await Promise.all([
                API.get(`/batches/${selectedBatch}/students`),
                API.get(`/attendance?batchId=${selectedBatch}&date=${date}`)
            ]);
            const studentList = Array.isArray(studentsRes.data) ? studentsRes.data : [];
            const existingRecords = Array.isArray(attendanceRes.data) ? attendanceRes.data : [];
            setStudents(studentList);
            const initialAttendance = {};
            studentList.forEach(student => {
                const record = existingRecords.find(r => (r.student?._id || r.student) === student._id);
                initialAttendance[student._id] = record ? record.status : 'Present';
            });
            setAttendance(initialAttendance);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally { setLoading(false); }
    };

    const toggleAttendance = (studentId, status) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const handleMarkAll = (status) => {
        const updated = {};
        students.forEach(s => { updated[s._id] = status; });
        setAttendance(updated);
        showToast(`Marked all ${students.length} scholars as ${status}`, 'success');
    };

    const showToast = (text, type = 'success') => {
        setStatusMessage({ text, type });
        setTimeout(() => setStatusMessage({ text: '', type: '' }), 4000);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        try {
            setSaving(true);
            const attendanceData = Object.entries(attendance).map(([studentId, status]) => ({
                student: studentId, 
                batch: selectedBatch, 
                date, 
                status
            }));
            await API.post('/attendance/bulk', { records: attendanceData });
            showToast('Attendance recorded and synced successfully!', 'success');
        } catch (error) {
            console.error('Attendance submit error', error);
            showToast('Failed to mark attendance: ' + (error.response?.data?.message || error.message), 'error');
        } finally { setSaving(false); }
    };

    const filteredStudents = useMemo(() => {
        return students.filter(s =>
            s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [students, searchTerm]);

    const presentCount = students.filter(s => attendance[s._id] === 'Present').length;
    const absentCount = students.length - presentCount;
    const attendanceRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;
    const currentBatchObj = batches.find(b => b._id === selectedBatch);

    return (
        <DashboardLayout user={user}>
            <div className="max-w-7xl mx-auto space-y-6 pb-12">
                {/* Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                            <span className="w-2.5 h-6 bg-indigo-600 rounded-full"></span>
                            Mark Attendance
                        </h1>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            {currentBatchObj?.name ? `${currentBatchObj.name} • ${currentBatchObj.subject || 'Class'}` : 'Select a batch'} | Session Date: {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/teacher/history')}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition-all cursor-pointer"
                        >
                            <FaHistory size={12} /> View Attendance Ledger
                        </button>
                    </div>
                </div>

                {/* Status Feedback Toast */}
                {statusMessage.text && (
                    <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 border transition-all ${
                        statusMessage.type === 'success' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}>
                        {statusMessage.type === 'success' ? <FaCheckCircle size={14} /> : <FaExclamationTriangle size={14} />}
                        <span>{statusMessage.text}</span>
                    </div>
                )}

                {/* Session Selector & Quick KPIs */}
                <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        {batch.name} {batch.subject ? `(${batch.subject})` : ''} {batch.timing ? `• ${batch.timing}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                Session Date
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Summary Statistics Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Enrolled</p>
                            <h4 className="text-xl font-extrabold text-slate-800 mt-1">{students.length}</h4>
                        </div>
                        <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-100">
                            <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Present</p>
                            <h4 className="text-xl font-extrabold text-emerald-900 mt-1">{presentCount}</h4>
                        </div>
                        <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-100">
                            <p className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">Absent</p>
                            <h4 className="text-xl font-extrabold text-rose-900 mt-1">{absentCount}</h4>
                        </div>
                        <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100">
                            <p className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider">Present Rate</p>
                            <h4 className="text-xl font-extrabold text-indigo-900 mt-1">{attendanceRate}%</h4>
                        </div>
                    </div>
                </div>

                {/* Roster Controls & Student Table */}
                <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden space-y-4 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="relative flex-1 max-w-md">
                            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                            <input
                                type="text"
                                placeholder="Search scholar by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleMarkAll('Present')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                            >
                                <FaCheck size={10} /> Mark All Present
                            </button>
                            <button
                                type="button"
                                onClick={() => handleMarkAll('Absent')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                            >
                                <FaTimes size={10} /> Mark All Absent
                            </button>
                        </div>
                    </div>

                    {/* Table / List */}
                    {loading ? (
                        <div className="py-16 text-center space-y-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
                            <p className="text-xs font-semibold text-slate-400">Loading student roster...</p>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 space-y-2">
                            <FaUsers size={32} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-sm font-bold text-slate-600">No students found</p>
                            <p className="text-xs text-slate-400">
                                {searchTerm ? 'Try adjusting your search filter.' : 'No active students enrolled in this batch.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-y border-slate-100">
                                        <th className="py-3 px-4">Scholar Identity</th>
                                        <th className="py-3 px-4">Academic Status</th>
                                        <th className="py-3 px-4">Attendance Metric</th>
                                        <th className="py-3 px-4 text-center">Status Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {filteredStudents.map((student) => {
                                        const isPresent = attendance[student._id] === 'Present';
                                        return (
                                            <tr key={student._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                                                            isPresent ? 'bg-indigo-600' : 'bg-slate-400'
                                                        }`}>
                                                            {student.name ? student.name.charAt(0).toUpperCase() : '?'}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800 text-sm leading-tight">{student.name}</p>
                                                            <p className="text-[11px] text-slate-400 font-medium">{student.email || 'No email registered'}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    {student.latestGrade ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-slate-100 text-slate-700">
                                                            Grade {student.latestGrade}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 font-medium text-[11px]">Ungraded</span>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full ${
                                                                    (student.attendancePercentage || 0) >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
                                                                }`}
                                                                style={{ width: `${Math.min(student.attendancePercentage || 0, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="font-bold text-slate-700 text-xs">
                                                            {student.attendancePercentage !== undefined ? `${student.attendancePercentage}%` : '—'}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4 text-center">
                                                    <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleAttendance(student._id, 'Present')}
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                                isPresent 
                                                                    ? 'bg-emerald-600 text-white shadow-sm' 
                                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                                                            }`}
                                                        >
                                                            <FaCheck size={10} /> Present
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleAttendance(student._id, 'Absent')}
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                                !isPresent 
                                                                    ? 'bg-rose-600 text-white shadow-sm' 
                                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                                                            }`}
                                                        >
                                                            <FaTimes size={10} /> Absent
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

                {/* Floating/Bottom Action Bar */}
                {students.length > 0 && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="text-xs text-slate-500 font-medium">
                            Ready to record <strong className="text-slate-800">{presentCount} Present</strong> and <strong className="text-slate-800">{absentCount} Absent</strong> for {new Date(date + 'T00:00:00').toLocaleDateString()}.
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={saving || loading}
                            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
                        >
                            <FaSave size={12} />
                            {saving ? 'Saving Attendance...' : 'Save & Sync Attendance'}
                        </button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AttendanceMarking;

