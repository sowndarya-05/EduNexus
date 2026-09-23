import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaTimes, FaLayerGroup, FaClock, FaUsers, FaPencilAlt, FaTrash, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/ui/Button';
import API from '../../api';

const BatchManagement = () => {
    const [user] = useState(() => {
        const saved = sessionStorage.getItem('user') || localStorage.getItem('user');
        try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
    });

    const [batches, setBatches] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionMsg, setActionMsg] = useState('');
    const [actionError, setActionError] = useState('');

    // Modal state — shared for add & edit
    const [showModal, setShowModal] = useState(false);
    const [editingBatch, setEditingBatch] = useState(null); // null = add, obj = edit
    const [batchForm, setBatchForm] = useState({
        name: '',
        teacherId: '',
        defaultFeeAmount: '',
        numberOfInstallments: '3'
    });
    const [timingOption, setTimingOption] = useState('9:00 AM - 11:00 AM');
    const [customStartTime, setCustomStartTime] = useState('');
    const [customEndTime, setCustomEndTime] = useState('');
    const [modalError, setModalError] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        fetchBatches();
        fetchTeachers();
    }, []);

    const fetchBatches = async () => {
        try {
            setLoading(true);
            const { data } = await API.get('/admin/batches');
            setBatches(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch batches', error);
            if (error.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const fetchTeachers = async () => {
        try {
            const { data } = await API.get('/admin/teachers');
            setTeachers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch teachers', error);
        }
    };

    const handleDeleteBatch = async (batchId, batchName) => {
        if (!window.confirm(`Are you sure you want to delete batch "${batchName || 'this batch'}"? This will archive the batch and unassign enrolled students.`)) return;

        setActionError('');
        try {
            await API.delete(`/admin/batches/${batchId}`);
            setActionMsg(`Batch ${batchName || ''} deleted successfully`);
            fetchBatches();
            setTimeout(() => setActionMsg(''), 3000);
        } catch (error) {
            setActionError(error.response?.data?.message || 'Failed to delete batch');
            setTimeout(() => setActionError(''), 3000);
        }
    };

    const PRESET_TIMINGS = [
        '9:00 AM - 11:00 AM',
        '11:00 AM - 1:00 PM',
        '3:00 PM - 5:00 PM',
        '5:00 PM - 7:00 PM',
        '6:00 PM - 8:00 PM',
        'Custom'
    ];

    const formatTimeTo12Hour = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        let hours = parseInt(h, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${m} ${ampm}`;
    };

    const openAddModal = () => {
        setEditingBatch(null);
        setBatchForm({ name: '', teacherId: '', defaultFeeAmount: '', numberOfInstallments: '3' });
        setTimingOption('9:00 AM - 11:00 AM');
        setCustomStartTime('');
        setCustomEndTime('');
        setModalError('');
        setShowModal(true);
    };

    const openEditModal = (batch) => {
        setEditingBatch(batch);
        setBatchForm({
            name: batch.name || '',
            teacherId: batch.teacherId || batch.teacher?._id || '',
            defaultFeeAmount: String(batch.defaultFeeAmount || batch.fees || ''),
            numberOfInstallments: String(batch.numberOfInstallments || '3')
        });
        // Detect if timing is preset or custom
        const existingTiming = batch.timing || '';
        if (PRESET_TIMINGS.includes(existingTiming)) {
            setTimingOption(existingTiming);
        } else {
            setTimingOption('Custom');
        }
        setCustomStartTime('');
        setCustomEndTime('');
        setModalError('');
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setModalError('');
        setSubmitting(true);

        try {
            let finalTiming = timingOption;
            if (timingOption === 'Custom') {
                if (!customStartTime || !customEndTime) {
                    setModalError('Please specify both start and end time for custom timing');
                    setSubmitting(false);
                    return;
                }
                finalTiming = `${formatTimeTo12Hour(customStartTime)} - ${formatTimeTo12Hour(customEndTime)}`;
            }

            const payload = {
                name: batchForm.name,
                teacherId: batchForm.teacherId || null,
                timing: finalTiming,
                defaultFeeAmount: Number(batchForm.defaultFeeAmount) || 0,
                numberOfInstallments: Number(batchForm.numberOfInstallments) || 3
            };

            if (editingBatch) {
                // PUT update
                await API.put(`/admin/batches/${editingBatch._id}`, payload);
                setActionMsg('Batch updated successfully');
            } else {
                // POST create
                await API.post('/admin/batches', payload);
                setActionMsg('Batch created successfully');
            }

            setShowModal(false);
            fetchBatches();
            setTimeout(() => setActionMsg(''), 3000);
        } catch (error) {
            setModalError(error.response?.data?.message || (editingBatch ? 'Failed to update batch' : 'Failed to create batch'));
        } finally {
            setSubmitting(false);
        }
    };

    const renderAttendanceBar = (percent) => {
        const p = Math.min(Math.max(Number(percent) || 0, 0), 100);
        let barColor = 'bg-rose-500';
        let textColor = 'text-rose-700';

        if (p > 85) {
            barColor = 'bg-emerald-500';
            textColor = 'text-emerald-700';
        } else if (p >= 70) {
            barColor = 'bg-amber-500';
            textColor = 'text-amber-700';
        }

        return (
            <div className="flex items-center gap-3 w-48">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${p}%` }}></div>
                </div>
                <span className={`text-xs font-bold ${textColor} w-12 text-right`}>{p.toFixed(1)}%</span>
            </div>
        );
    };

    const filteredBatches = batches.filter(b =>
        b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.teacherName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Batch Management</h1>
                        <p className="text-xs font-medium text-slate-400 mt-1">Configure class schedules, assigned faculty, and attendance metrics.</p>
                    </div>
                    <Button variant="primary" onClick={openAddModal} className="flex items-center gap-2">
                        <FaPlus size={11} /> Create Batch
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
                        <h3 className="text-sm font-bold text-slate-800">Academic Batches ({filteredBatches.length})</h3>
                        <input
                            type="text"
                            placeholder="Search batch by name or teacher..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : filteredBatches.length === 0 ? (
                        <div className="text-center py-16 px-4">
                            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                                <FaLayerGroup size={20} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-800">No batches found</h3>
                            <p className="text-xs text-slate-400 mt-1">Click "Create Batch" above to configure a new learning batch.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="py-3.5 px-6">Batch Name</th>
                                        <th className="py-3.5 px-6">Teacher</th>
                                        <th className="py-3.5 px-6">Default Fee (₹)</th>
                                        <th className="py-3.5 px-6">Students Enrolled</th>
                                        <th className="py-3.5 px-6">Timing</th>
                                        <th className="py-3.5 px-6">Attendance %</th>
                                        <th className="py-3.5 px-6">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {filteredBatches.map((b) => (
                                        <tr key={b._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-6 font-bold text-indigo-600">{b.name}</td>
                                            <td className="py-4 px-6 font-semibold text-slate-700">{b.teacherName || b.teacher?.name || 'Unassigned'}</td>
                                            <td className="py-4 px-6 font-bold text-slate-800">₹{b.defaultFeeAmount?.toLocaleString() || b.fees?.toLocaleString() || '0'} ({b.numberOfInstallments || 3} Inst)</td>
                                            <td className="py-4 px-6">
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-bold text-slate-700">
                                                    <FaUsers size={11} className="text-slate-400" />
                                                    <span>{b.studentsEnrolled ?? b.studentsCount ?? 0} Enrolled</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 font-medium text-slate-500">
                                                <div className="flex items-center gap-1.5">
                                                    <FaClock size={11} className="text-slate-400" />
                                                    <span>{b.timing}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                {renderAttendanceBar(b.attendancePercentage)}
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        title="Edit Batch"
                                                        onClick={() => openEditModal(b)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                                    >
                                                        <FaPencilAlt size={12} />
                                                    </button>
                                                    <button
                                                        title="Delete Batch"
                                                        onClick={() => handleDeleteBatch(b._id, b.name)}
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

            {/* Create / Edit Batch Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-100 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
                        >
                            <FaTimes size={16} />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-2">
                            {editingBatch ? 'Edit Batch' : 'Create New Batch'}
                        </h2>
                        <p className="text-xs text-slate-400 font-medium mb-6">
                            {editingBatch
                                ? 'Update batch details, teacher assignment, and fee settings.'
                                : 'Assign faculty instructor, class timing slot, and fee settings.'
                            }
                        </p>

                        {modalError && (
                            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold rounded-xl">
                                {modalError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Batch Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 text-slate-800 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                                    placeholder="e.g. NEET-B2 or Morning 9AM"
                                    value={batchForm.name}
                                    onChange={e => setBatchForm({ ...batchForm, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Assigned Teacher</label>
                                <select
                                    required
                                    className="w-full px-4 py-2.5 text-slate-800 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
                                    value={batchForm.teacherId}
                                    onChange={e => setBatchForm({ ...batchForm, teacherId: e.target.value })}
                                >
                                    <option value="">Select Teacher</option>
                                    {teachers.map((t) => (
                                        <option key={t._id} value={t._id}>{t.name} ({t.email})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Default Batch Fee Amount (₹)</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    className="w-full px-4 py-2.5 text-slate-800 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                                    placeholder="e.g. 15000"
                                    value={batchForm.defaultFeeAmount}
                                    onChange={e => setBatchForm({ ...batchForm, defaultFeeAmount: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Number of Installments</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    max="12"
                                    className="w-full px-4 py-2.5 text-slate-800 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                                    placeholder="Default: 3"
                                    value={batchForm.numberOfInstallments}
                                    onChange={e => setBatchForm({ ...batchForm, numberOfInstallments: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Class Timing Slot</label>
                                <select
                                    className="w-full px-4 py-2.5 text-slate-800 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
                                    value={timingOption}
                                    onChange={e => setTimingOption(e.target.value)}
                                >
                                    <option value="9:00 AM - 11:00 AM">9:00 AM - 11:00 AM</option>
                                    <option value="11:00 AM - 1:00 PM">11:00 AM - 1:00 PM</option>
                                    <option value="3:00 PM - 5:00 PM">3:00 PM - 5:00 PM</option>
                                    <option value="5:00 PM - 7:00 PM">5:00 PM - 7:00 PM</option>
                                    <option value="6:00 PM - 8:00 PM">6:00 PM - 8:00 PM</option>
                                    <option value="Custom">Custom</option>
                                </select>
                            </div>

                            {timingOption === 'Custom' && (
                                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                    <div>
                                        <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">Start Time</label>
                                        <input
                                            type="time"
                                            required
                                            className="w-full px-3 py-2 text-slate-800 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={customStartTime}
                                            onChange={e => setCustomStartTime(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">End Time</label>
                                        <input
                                            type="time"
                                            required
                                            className="w-full px-3 py-2 text-slate-800 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={customEndTime}
                                            onChange={e => setCustomEndTime(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? 'Saving...' : editingBatch ? 'Save Changes' : 'Create Batch'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default BatchManagement;
