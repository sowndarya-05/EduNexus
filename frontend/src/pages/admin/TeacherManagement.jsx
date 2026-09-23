import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaTimes, FaChalkboardTeacher, FaCheck, FaPencilAlt, FaTrash, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/ui/Button';
import API from '../../api';

const TeacherManagement = () => {
    const [user] = useState(() => {
        const saved = sessionStorage.getItem('user') || localStorage.getItem('user');
        try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
    });

    const [teachers, setTeachers] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionMsg, setActionMsg] = useState('');
    const [actionError, setActionError] = useState('');

    // Modal state — shared for add & edit
    const [showModal, setShowModal] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState(null); // null = add mode, obj = edit mode
    const [teacherForm, setTeacherForm] = useState({
        name: '',
        email: '',
        batchIds: []
    });
    const [modalError, setModalError] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        fetchTeachers();
        fetchBatches();
    }, []);

    const fetchTeachers = async () => {
        try {
            setLoading(true);
            const { data } = await API.get('/admin/teachers');
            setTeachers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch teachers', error);
            if (error.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const fetchBatches = async () => {
        try {
            const { data } = await API.get('/admin/batches');
            setBatches(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch batches', error);
        }
    };

    const openAddModal = () => {
        setEditingTeacher(null);
        setTeacherForm({ name: '', email: '', batchIds: [] });
        setModalError('');
        setShowModal(true);
    };

    const openEditModal = (teacher) => {
        setEditingTeacher(teacher);
        // Resolve batch IDs from assigned batch names using the batches list
        const assignedIds = batches
            .filter(b => teacher.assignedBatches?.includes(b.name))
            .map(b => b._id);
        setTeacherForm({
            name: teacher.name || '',
            email: teacher.email || '',
            batchIds: teacher.batchIds || assignedIds || []
        });
        setModalError('');
        setShowModal(true);
    };

    const handleDeleteTeacher = async (teacherId, teacherName) => {
        if (!window.confirm(`Are you sure you want to delete teacher "${teacherName || 'this teacher'}"? This will unassign them from any active batches.`)) return;

        setActionError('');
        try {
            await API.delete(`/admin/teachers/${teacherId}`);
            setActionMsg(`Teacher ${teacherName || ''} deleted successfully`);
            fetchTeachers();
            fetchBatches();
            setTimeout(() => setActionMsg(''), 3000);
        } catch (error) {
            setActionError(error.response?.data?.message || 'Failed to delete teacher');
            setTimeout(() => setActionError(''), 3000);
        }
    };

    const handleBatchToggle = (batchId) => {
        setTeacherForm(prev => {
            const exists = prev.batchIds.includes(batchId);
            const updated = exists
                ? prev.batchIds.filter(id => id !== batchId)
                : [...prev.batchIds, batchId];
            return { ...prev, batchIds: updated };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setModalError('');
        setSubmitting(true);

        try {
            if (editingTeacher) {
                // Edit mode — PUT request
                await API.put(`/admin/teachers/${editingTeacher._id}`, {
                    name: teacherForm.name,
                    batchIds: teacherForm.batchIds
                });
                setActionMsg('Teacher updated successfully');
            } else {
                // Add mode — POST request
                await API.post('/admin/teachers', teacherForm);
                setActionMsg('Teacher account created successfully');
            }
            setShowModal(false);
            setTeacherForm({ name: '', email: '', batchIds: [] });
            fetchTeachers();
            fetchBatches();
            setTimeout(() => setActionMsg(''), 3000);
        } catch (error) {
            setModalError(error.response?.data?.message || (editingTeacher ? 'Failed to update teacher' : 'Failed to create teacher account'));
        } finally {
            setSubmitting(false);
        }
    };

    const filteredTeachers = teachers.filter(t =>
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Teacher Management</h1>
                        <p className="text-xs font-medium text-slate-400 mt-1">Manage teaching faculty, batch assignments, and credentials.</p>
                    </div>
                    <Button variant="primary" onClick={openAddModal} className="flex items-center gap-2">
                        <FaPlus size={11} /> Add Teacher
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

                {/* Table Section */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-premium overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800">Faculty Roster ({filteredTeachers.length})</h3>
                        <input
                            type="text"
                            placeholder="Search teacher by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : filteredTeachers.length === 0 ? (
                        <div className="text-center py-16 px-4">
                            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                                <FaChalkboardTeacher size={20} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-800">No teachers found</h3>
                            <p className="text-xs text-slate-400 mt-1">Click "Add Teacher" above to register faculty members.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="py-3.5 px-6">Teacher Name</th>
                                        <th className="py-3.5 px-6">Email</th>
                                        <th className="py-3.5 px-6">Assigned Batches</th>
                                        <th className="py-3.5 px-6">Student Count</th>
                                        <th className="py-3.5 px-6">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {filteredTeachers.map((t) => (
                                        <tr key={t._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-6 font-bold text-slate-800">{t.name}</td>
                                            <td className="py-4 px-6 text-slate-600 font-medium">{t.email}</td>
                                            <td className="py-4 px-6">
                                                {t.assignedBatches && t.assignedBatches.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {t.assignedBatches.map((bName, idx) => (
                                                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                                {bName}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 font-medium">No batches assigned</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 font-bold text-slate-800">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-700">
                                                    {t.studentCount || 0} Students
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        title="Edit Teacher"
                                                        onClick={() => openEditModal(t)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                                    >
                                                        <FaPencilAlt size={12} />
                                                    </button>
                                                    <button
                                                        title="Delete Teacher"
                                                        onClick={() => handleDeleteTeacher(t._id, t.name)}
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
                </div>
            </div>

            {/* Add / Edit Teacher Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-100 shadow-2xl relative">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
                        >
                            <FaTimes size={16} />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-2">
                            {editingTeacher ? 'Edit Teacher' : 'New Teacher Account'}
                        </h2>
                        <p className="text-xs text-slate-400 font-medium mb-6">
                            {editingTeacher
                                ? 'Update teacher name and batch assignments.'
                                : <>Default temporary password will be set to <span className="font-mono text-indigo-600 font-bold">Temp@1234</span> with first-login password setup required.</>
                            }
                        </p>

                        {modalError && (
                            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold rounded-xl">
                                {modalError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 text-slate-800 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                                    placeholder="Teacher's Full Name"
                                    value={teacherForm.name}
                                    onChange={e => setTeacherForm({ ...teacherForm, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Email Address (Login ID)</label>
                                <input
                                    type="email"
                                    required={!editingTeacher}
                                    disabled={!!editingTeacher}
                                    className={`w-full px-4 py-2.5 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${editingTeacher ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 focus:bg-white'}`}
                                    placeholder="teacher@institution.com"
                                    value={teacherForm.email}
                                    onChange={e => setTeacherForm({ ...teacherForm, email: e.target.value })}
                                />
                                {editingTeacher && <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed after account creation.</p>}
                            </div>

                            <div>
                                <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Assign Batches (Multi-select)</label>
                                {batches.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No existing batches found.</p>
                                ) : (
                                    <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-3 bg-slate-50">
                                        {batches.map((batch) => {
                                            const isSelected = teacherForm.batchIds.includes(batch._id);
                                            return (
                                                <div
                                                    key={batch._id}
                                                    onClick={() => handleBatchToggle(batch._id)}
                                                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs font-semibold transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
                                                >
                                                    <span>{batch.name} ({batch.timing})</span>
                                                    {isSelected && <FaCheck size={12} />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? 'Saving...' : editingTeacher ? 'Save Changes' : 'Create Teacher'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default TeacherManagement;
