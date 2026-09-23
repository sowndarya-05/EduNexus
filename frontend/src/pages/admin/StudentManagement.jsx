import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaSearch, FaFilter, FaTimes, FaUserGraduate, FaPencilAlt, FaEye, FaTrash, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/ui/Button';
import API from '../../api';

const StudentManagement = () => {
    const [user] = useState(() => {
        const saved = sessionStorage.getItem('user') || localStorage.getItem('user');
        try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
    });

    const [students, setStudents] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [actionMsg, setActionMsg] = useState('');
    const [actionError, setActionError] = useState('');

    // Filters state
    const [selectedBatch, setSelectedBatch] = useState('');
    const [selectedFeeStatus, setSelectedFeeStatus] = useState('');
    const [selectedRiskLevel, setSelectedRiskLevel] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal state for Add Student
    const [showModal, setShowModal] = useState(false);
    const [newStudent, setNewStudent] = useState({
        name: '',
        email: '',
        parentEmail: '',
        batchId: ''
    });
    const [modalError, setModalError] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        fetchBatches();
    }, []);

    useEffect(() => {
        fetchStudents();
    }, [selectedBatch, selectedFeeStatus, selectedRiskLevel, searchTerm, page]);

    const fetchBatches = async () => {
        try {
            const { data } = await API.get('/admin/batches');
            setBatches(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch batches', error);
        }
    };

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const params = {};
            if (selectedBatch) params.batch = selectedBatch;
            if (selectedFeeStatus) params.feeStatus = selectedFeeStatus;
            if (selectedRiskLevel) params.riskLevel = selectedRiskLevel;
            if (searchTerm) params.search = searchTerm;
            params.page = page;
            params.limit = 10;

            const { data } = await API.get('/admin/students', { params });

            if (data && Array.isArray(data.students)) {
                setStudents(data.students);
                setTotalPages(data.pages || 1);
            } else if (Array.isArray(data)) {
                setStudents(data);
                setTotalPages(1);
            } else {
                setStudents([]);
            }
        } catch (error) {
            console.error('Failed to fetch students', error);
            if (error.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const handleAddStudentSubmit = async (e) => {
        e.preventDefault();
        setModalError('');
        setSubmitting(true);

        try {
            const payload = {
                name: newStudent.name,
                email: newStudent.email,
                parentEmail: newStudent.parentEmail,
                batchId: newStudent.batchId
            };

            await API.post('/admin/students', payload);
            setShowModal(false);
            setNewStudent({ name: '', email: '', parentEmail: '', batchId: '' });
            fetchStudents();
        } catch (error) {
            setModalError(error.response?.data?.message || 'Failed to create student');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteStudent = async (studentId, studentName) => {
        if (!window.confirm(`Are you sure you want to delete student "${studentName || 'this student'}"? This will remove them from the batch and archive their records.`)) return;

        setActionError('');
        try {
            await API.delete(`/admin/students/${studentId}`);
            setActionMsg(`Student ${studentName || ''} deleted successfully`);
            fetchStudents();
            setTimeout(() => setActionMsg(''), 3000);
        } catch (error) {
            setActionError(error.response?.data?.message || 'Failed to delete student');
            setTimeout(() => setActionError(''), 3000);
        }
    };

    const renderFeePill = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'paid') {
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    Paid
                </span>
            );
        } else if (s === 'overdue') {
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">
                    Overdue
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                    Pending
                </span>
            );
        }
    };

    const renderRiskPill = (level) => {
        const l = (level || '').toLowerCase();
        if (l === 'high') {
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">
                    High
                </span>
            );
        } else if (l === 'medium') {
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                    Medium
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    Low
                </span>
            );
        }
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Students Directory</h1>
                        <p className="text-xs font-medium text-slate-400 mt-1">Manage enrolled students, fees, attendance, and risk profiles.</p>
                    </div>
                    <Button variant="primary" onClick={() => setShowModal(true)} className="flex items-center gap-2">
                        <FaPlus size={11} /> Add Student
                    </Button>
                </div>

                {/* Notifications */}
                {actionMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                        <FaCheckCircle /> {actionMsg}
                    </div>
                )}
                {actionError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                        <FaExclamationTriangle /> {actionError}
                    </div>
                )}

                {/* Filter Bar */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <FaFilter size={11} /> Filter & Search
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Search Input */}
                        <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                                <FaSearch size={12} />
                            </span>
                            <input
                                type="text"
                                placeholder="Search by student name..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                className="w-full pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                            />
                        </div>

                        {/* Batch Dropdown */}
                        <div>
                            <select
                                value={selectedBatch}
                                onChange={(e) => { setSelectedBatch(e.target.value); setPage(1); }}
                                className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
                            >
                                <option value="">All Batches</option>
                                {batches.map((b) => (
                                    <option key={b._id} value={b._id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Fee Status Dropdown */}
                        <div>
                            <select
                                value={selectedFeeStatus}
                                onChange={(e) => { setSelectedFeeStatus(e.target.value); setPage(1); }}
                                className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
                            >
                                <option value="">All Fee Statuses</option>
                                <option value="paid">Paid</option>
                                <option value="pending">Pending</option>
                                <option value="overdue">Overdue</option>
                            </select>
                        </div>

                        {/* Risk Level Dropdown */}
                        <div>
                            <select
                                value={selectedRiskLevel}
                                onChange={(e) => { setSelectedRiskLevel(e.target.value); setPage(1); }}
                                className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
                            >
                                <option value="">All Risk Levels</option>
                                <option value="low">Low Risk</option>
                                <option value="medium">Medium Risk</option>
                                <option value="high">High Risk</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-premium overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-16 px-4">
                            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                                <FaUserGraduate size={20} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-800">No students match these filters</h3>
                            <p className="text-xs text-slate-400 mt-1">Try resetting search or dropdown selections.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="py-3.5 px-6">Student Name</th>
                                        <th className="py-3.5 px-6">Batch</th>
                                        <th className="py-3.5 px-6">Attendance %</th>
                                        <th className="py-3.5 px-6">Fee Status</th>
                                        <th className="py-3.5 px-6">Risk Level</th>
                                        <th className="py-3.5 px-6">Parent Email</th>
                                        <th className="py-3.5 px-6">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {students.map((student) => (
                                        <tr key={student._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-6 font-bold text-slate-800">
                                                <div className="inline-flex items-center gap-2">
                                                    <span>{student.studentName || student.name}</span>
                                                    {student.isNew && (
                                                        <span className="px-2 py-0.5 text-[10px] font-extrabold bg-blue-100 text-blue-700 rounded-full uppercase tracking-wider">
                                                            New
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 font-semibold text-indigo-600">{student.batchName || student.batch?.name || 'Unassigned'}</td>
                                            <td className="py-4 px-6 font-bold text-slate-800">
                                                {typeof student.attendancePercentage === 'number' ? student.attendancePercentage.toFixed(1) : '0.0'}%
                                            </td>
                                            <td className="py-4 px-6">{renderFeePill(student.fees?.status)}</td>
                                            <td className="py-4 px-6">{renderRiskPill(student.riskLevel)}</td>
                                            <td className="py-4 px-6 text-slate-500 font-medium">{student.parentEmail || '-'}</td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        title="View Profile"
                                                        onClick={() => navigate(`/admin/students/${student._id}`)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                    >
                                                        <FaEye size={13} />
                                                    </button>
                                                    <button
                                                        title="Edit Student"
                                                        onClick={() => navigate(`/admin/students/edit/${student._id}`)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                                    >
                                                        <FaPencilAlt size={12} />
                                                    </button>
                                                    <button
                                                        title="Delete Student"
                                                        onClick={() => handleDeleteStudent(student._id, student.studentName || student.name)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                    >
                                                        <FaTrash size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(page - 1)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="text-xs font-semibold text-slate-500">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(page + 1)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Overlay: Add Student */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-100 shadow-2xl relative">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
                        >
                            <FaTimes size={16} />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-2">Enroll New Student</h2>
                        <p className="text-xs text-slate-400 font-medium mb-6">Fees are auto-inherited from batch. Parent account password defaults to Temp@1234.</p>

                        {modalError && (
                            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold rounded-xl">
                                {modalError}
                            </div>
                        )}

                        <form onSubmit={handleAddStudentSubmit} className="space-y-4">
                            <div>
                                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Student Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 text-slate-800 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                                    placeholder="Full Name"
                                    value={newStudent.name}
                                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Student Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-4 py-2.5 text-slate-800 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                                    placeholder="student@example.com"
                                    value={newStudent.email}
                                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Parent Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-4 py-2.5 text-slate-800 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                                    placeholder="parent@example.com"
                                    value={newStudent.parentEmail}
                                    onChange={(e) => setNewStudent({ ...newStudent, parentEmail: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Assigned Batch</label>
                                <select
                                    required
                                    className="w-full px-4 py-2.5 text-slate-800 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
                                    value={newStudent.batchId}
                                    onChange={(e) => setNewStudent({ ...newStudent, batchId: e.target.value })}
                                >
                                    <option value="">Select Batch</option>
                                    {batches.map((b) => (
                                        <option key={b._id} value={b._id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? 'Creating...' : 'Enroll Student'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default StudentManagement;
