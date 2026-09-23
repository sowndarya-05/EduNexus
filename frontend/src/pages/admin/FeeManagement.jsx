import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaWallet, FaClock, FaCheckCircle, FaExclamationTriangle,
    FaBell, FaSearch, FaDownload, FaHistory, FaCreditCard,
    FaTrash, FaTimes, FaRupeeSign
} from 'react-icons/fa';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import API from '../../api';

const MONTHS = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
];

const FeeManagement = () => {
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);

    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    const [analytics, setAnalytics] = useState({
        batches: [],
        overall: { totalCollected: 0, totalPending: 0, totalStudentsPaid: 0, totalStudentsPending: 0, totalStudentsUnpaid: 0 }
    });

    const [selectedBatchCardId, setSelectedBatchCardId] = useState('');
    const [statusBreakdown, setStatusBreakdown] = useState({ paid: 0, partiallyPaid: 0, pending: 0, overdue: 0 });
    const [upcomingDues, setUpcomingDues] = useState([]);
    const [showUpcomingTab, setShowUpcomingTab] = useState(false);
    const [fees, setFees] = useState([]);
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const [showRecordModal, setShowRecordModal] = useState(false);
    const [currentFeeForRecord, setCurrentFeeForRecord] = useState(null);
    const [recordForm, setRecordForm] = useState({ amount: '', paymentMode: 'cash', note: '' });

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [currentFeeForHistory, setCurrentFeeForHistory] = useState(null);

    const [editingPaymentEntry, setEditingPaymentEntry] = useState(null);
    const [editEntryForm, setEditEntryForm] = useState({ amount: '', paymentMode: 'cash', note: '' });

    const [submitting, setSubmitting] = useState(false);
    const [actionMsg, setActionMsg] = useState('');
    const [actionError, setActionError] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        fetchBatches();
        fetchUpcomingDues();
    }, []);

    useEffect(() => {
        fetchAnalytics();
        fetchStatusBreakdown();
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        fetchFees();
    }, [selectedBatch, selectedStatus, searchTerm, selectedMonth, selectedYear, page]);

    const fetchBatches = async () => {
        try {
            const { data } = await API.get('/admin/batches');
            const batchList = Array.isArray(data) ? data : [];
            setBatches(batchList);
            if (batchList.length > 0 && !selectedBatchCardId) {
                setSelectedBatchCardId(batchList[0]._id);
            }
        } catch (error) {
            console.error('Failed to fetch batches', error);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const { data } = await API.get(`/admin/fees/analytics?month=${selectedMonth}&year=${selectedYear}`);
            if (data) {
                setAnalytics(data);
                if (data.batches && data.batches.length > 0 && !selectedBatchCardId) {
                    setSelectedBatchCardId(data.batches[0].batchId);
                }
            }
        } catch (error) {
            console.error('Failed to fetch fee analytics', error);
        }
    };

    const fetchStatusBreakdown = async () => {
        try {
            const { data } = await API.get(`/admin/fees/status-breakdown?month=${selectedMonth}&year=${selectedYear}`);
            if (data) setStatusBreakdown(data);
        } catch (error) {
            console.error('Failed to fetch fee status breakdown', error);
        }
    };

    const fetchUpcomingDues = async () => {
        try {
            const { data } = await API.get('/admin/fees/upcoming?days=7');
            setUpcomingDues(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch upcoming dues', error);
        }
    };

    const fetchFees = async () => {
        try {
            setLoading(true);
            const params = {
                page,
                limit: 15,
                month: selectedMonth,
                year: selectedYear
            };
            if (selectedBatch) params.batch = selectedBatch;
            if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus;
            if (searchTerm) params.search = searchTerm;

            const { data } = await API.get('/admin/fees', { params });
            if (data && Array.isArray(data.fees)) {
                setFees(data.fees);
                setTotalPages(data.pages || 1);
            } else {
                setFees(Array.isArray(data) ? data : []);
                setTotalPages(1);
            }
        } catch (error) {
            console.error('Failed to fetch fees', error);
        } finally {
            setLoading(false);
        }
    };

    const activeBatchData = useMemo(() => {
        if (!analytics.batches || analytics.batches.length === 0) return null;
        const found = analytics.batches.find(b => b.batchId === selectedBatchCardId);
        return found || analytics.batches[0];
    }, [analytics.batches, selectedBatchCardId]);

    const activeBatchPercent = useMemo(() => {
        if (!activeBatchData) return 0;
        const total = (activeBatchData.totalCollected || 0) + (activeBatchData.totalPending || 0);
        if (total === 0) return 0;
        return Math.min(100, Math.round(((activeBatchData.totalCollected || 0) / total) * 100));
    }, [activeBatchData]);

    const handleOpenRecordModal = (fee) => {
        setCurrentFeeForRecord(fee);
        const remaining = fee.amount - fee.amountPaid;
        setRecordForm({
            amount: remaining > 0 ? remaining : '',
            paymentMode: 'cash',
            note: ''
        });
        setActionError('');
        setShowRecordModal(true);
    };

    const handleRecordPaymentSubmit = async (e) => {
        e.preventDefault();
        if (!currentFeeForRecord) return;
        setSubmitting(true);
        setActionError('');
        try {
            await API.patch(`/admin/fees/${currentFeeForRecord._id}/record-payment`, {
                amount: Number(recordForm.amount),
                paymentMode: recordForm.paymentMode,
                note: recordForm.note
            });
            setShowRecordModal(false);
            setActionMsg('Payment recorded successfully!');
            fetchFees();
            fetchAnalytics();
            fetchStatusBreakdown();
            fetchUpcomingDues();
            setTimeout(() => setActionMsg(''), 3000);
        } catch (error) {
            setActionError(error.response?.data?.message || 'Failed to record payment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenHistoryModal = (fee) => {
        setCurrentFeeForHistory(fee);
        setEditingPaymentEntry(null);
        setActionError('');
        setShowHistoryModal(true);
    };

    const handleStartEditEntry = (entry) => {
        setEditingPaymentEntry(entry._id);
        setEditEntryForm({
            amount: entry.amount,
            paymentMode: entry.mode || 'cash',
            note: entry.note || ''
        });
    };

    const handleSaveEditEntry = async (paymentHistoryId) => {
        if (!currentFeeForHistory) return;
        setActionError('');
        try {
            const { data } = await API.patch(`/admin/fees/${currentFeeForHistory._id}/payment/${paymentHistoryId}`, {
                amount: Number(editEntryForm.amount),
                paymentMode: editEntryForm.paymentMode,
                note: editEntryForm.note
            });
            setCurrentFeeForHistory(data);
            setEditingPaymentEntry(null);
            setActionMsg('Payment entry updated!');
            fetchFees();
            fetchAnalytics();
            fetchStatusBreakdown();
            fetchUpcomingDues();
            setTimeout(() => setActionMsg(''), 3000);
        } catch (error) {
            setActionError(error.response?.data?.message || 'Failed to edit payment entry');
        }
    };

    const handleUndoPayment = async (paymentHistoryId) => {
        if (!currentFeeForHistory || !window.confirm('Are you sure?')) return;
        setActionError('');
        try {
            const { data } = await API.delete(`/admin/fees/${currentFeeForHistory._id}/payment/${paymentHistoryId}`);
            setCurrentFeeForHistory(data);
            setActionMsg('Payment undone successfully');
            fetchFees();
            fetchAnalytics();
            fetchStatusBreakdown();
            fetchUpcomingDues();
            setTimeout(() => setActionMsg(''), 3000);
        } catch (error) {
            setActionError(error.response?.data?.message || 'Failed to undo payment');
        }
    };

    const handleDeleteFee = async (feeId) => {
        if (!window.confirm('Delete this record?')) return;
        try {
            await API.delete(`/admin/fees/${feeId}`);
            setActionMsg('Fee record deleted');
            fetchFees();
            fetchAnalytics();
            fetchStatusBreakdown();
            fetchUpcomingDues();
            setTimeout(() => setActionMsg(''), 3000);
        } catch (error) {
            setActionError('Failed to delete');
            setTimeout(() => setActionError(''), 3000);
        }
    };

    const handleExportCSV = () => {
        if (fees.length === 0) return alert('No records to export');
        const headers = ['Student Name', 'Batch', 'Installment #', 'Amount (₹)', 'Paid (₹)', 'Balance (₹)', 'Status', 'Due Date'];
        const csvRows = [headers.join(',')];
        fees.forEach(f => {
            csvRows.push([
                `"${f.student?.name || 'Unknown'}"`,
                `"${f.batch?.name || 'Unassigned'}"`,
                f.installmentNumber || 1,
                f.amount || 0,
                f.amountPaid || 0,
                (f.amount || 0) - (f.amountPaid || 0),
                f.status,
                new Date(f.dueDate).toLocaleDateString()
            ].join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Fees_${Date.now()}.csv`;
        link.click();
    };

    const renderStatusPill = (status) => {
        const s = (status || '').toLowerCase();
        const colors = {
            paid: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
            partially_paid: 'bg-amber-50 text-amber-700 border-amber-200/60',
            pending: 'bg-blue-50 text-blue-700 border-blue-200/60',
            overdue: 'bg-rose-50 text-rose-700 border-rose-200/60'
        };
        return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${colors[s] || 'bg-slate-50'}`}>${status?.replace('_', ' ')}</span>;
    };

    const chartData = useMemo(() => [
        { name: 'Paid', value: statusBreakdown.paid || 0, color: '#059669' },
        { name: 'Partially paid', value: statusBreakdown.partiallyPaid || 0, color: '#d97706' },
        { name: 'Pending', value: statusBreakdown.pending || 0, color: '#2563eb' },
        { name: 'Overdue', value: statusBreakdown.overdue || 0, color: '#dc2626' }
    ], [statusBreakdown]);

    const totalStatusCount = (statusBreakdown.paid || 0) + (statusBreakdown.partiallyPaid || 0) + (statusBreakdown.pending || 0) + (statusBreakdown.overdue || 0);

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6 pb-12">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Fees &amp; records</h1>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Batch-wise collection status for {selectedMonth === 'all' ? 'All Months' : `${MONTHS.find(m => m.value === selectedMonth)?.label} ${selectedYear}`}
                    </p>
                </div>

                {/* Notifications */}
                {actionMsg && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2"><FaCheckCircle /> {actionMsg}</div>}
                {actionError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2"><FaExclamationTriangle /> {actionError}</div>}

                {/* Top Batch Card */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800">{activeBatchData?.batchName || 'Select Batch'}</span>
                        <select value={selectedBatchCardId} onChange={(e) => setSelectedBatchCardId(e.target.value)} className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer">
                            {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden"><div className="bg-emerald-600 h-2 rounded-full transition-all duration-500" style={{ width: `${activeBatchPercent}%` }} /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-emerald-50/60 border border-emerald-100/80 rounded-xl p-4"><p className="text-xs font-semibold text-emerald-800">Collected</p><h4 className="text-xl font-extrabold text-emerald-900 mt-1">₹{activeBatchData?.totalCollected?.toLocaleString() || 0}</h4></div>
                        <div className="bg-amber-50/60 border border-amber-100/80 rounded-xl p-4"><p className="text-xs font-semibold text-amber-800">Pending</p><h4 className="text-xl font-extrabold text-amber-900 mt-1">₹{activeBatchData?.totalPending?.toLocaleString() || 0}</h4></div>
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500 pt-1">
                        <div>Paid <strong className="text-slate-800 font-bold ml-1">{activeBatchData?.studentsPaid || 0}</strong></div>
                        <div>Pending <strong className="text-slate-800 font-bold ml-1">{activeBatchData?.studentsPending || 0}</strong></div>
                        <div>Unpaid <strong className="text-slate-800 font-bold ml-1">{activeBatchData?.studentsUnpaid || 0}</strong></div>
                    </div>
                </div>

                {/* Overall Summary Cards */}
                <div className="space-y-3">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg"><FaWallet /></div><div><p className="text-[11px] font-medium text-slate-400">Total collected</p><h3 className="text-lg font-extrabold text-slate-800">₹{analytics.overall?.totalCollected?.toLocaleString() || 0}</h3></div></div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg"><FaClock /></div><div><p className="text-[11px] font-medium text-slate-400">Total pending</p><h3 className="text-lg font-extrabold text-slate-800">₹{analytics.overall?.totalPending?.toLocaleString() || 0}</h3></div></div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-lg"><FaCheckCircle /></div><div><p className="text-[11px] font-medium text-slate-400">Paid students</p><h3 className="text-lg font-extrabold text-slate-800">{analytics.overall?.totalStudentsPaid || 0}</h3></div></div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg"><FaExclamationTriangle /></div><div><p className="text-[11px] font-medium text-slate-400">Unpaid / overdue</p><h3 className="text-lg font-extrabold text-slate-800">{(analytics.overall?.totalStudentsUnpaid || 0) + (analytics.overall?.totalStudentsPending || 0)}</h3></div></div>
                </div>

                {/* Fee Payment Status Breakdown */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800">Fee payment status breakdown</h3><span className="text-xs font-semibold text-slate-400">{selectedMonth === 'all' ? 'All Months' : MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}</span></div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        <div className="md:col-span-4 h-48 flex items-center justify-center relative">
                            {totalStatusCount === 0 ? <div className="text-xs text-slate-400 italic">No records</div> : <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">{chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>}
                        </div>
                        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-800"><span className="w-2 h-2 rounded-full bg-emerald-600"></span> Paid</div><h4 className="text-2xl font-extrabold text-emerald-900 mt-2">{statusBreakdown.paid || 0}</h4></div>
                            <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3.5"><div className="flex items-center gap-2 text-xs font-semibold text-amber-800"><span className="w-2 h-2 rounded-full bg-amber-600"></span> Partially paid</div><h4 className="text-2xl font-extrabold text-amber-900 mt-2">{statusBreakdown.partiallyPaid || 0}</h4></div>
                            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5"><div className="flex items-center gap-2 text-xs font-semibold text-blue-800"><span className="w-2 h-2 rounded-full bg-blue-600"></span> Pending</div><h4 className="text-2xl font-extrabold text-blue-900 mt-2">{statusBreakdown.pending || 0}</h4></div>
                            <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3.5"><div className="flex items-center gap-2 text-xs font-semibold text-rose-800"><span className="w-2 h-2 rounded-full bg-rose-600"></span> Overdue</div><h4 className="text-2xl font-extrabold text-rose-900 mt-2">{statusBreakdown.overdue || 0}</h4></div>
                        </div>
                    </div>
                </div>

                {/* Due Soon Widget */}
                <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3"><div className="text-amber-600 text-base"><FaBell /></div><div><h4 className="text-xs font-bold text-amber-900">Due soon — next 7 days</h4><p className="text-[11px] text-amber-700 font-medium mt-0.5">{upcomingDues.length} students have a payment due.</p></div></div>
                    <button onClick={() => setShowUpcomingTab(!showUpcomingTab)} className="text-xs font-bold text-amber-800 hover:text-amber-900 cursor-pointer">{showUpcomingTab ? 'Collapse' : `View ${upcomingDues.length} upcoming >`}</button>
                </div>

                {showUpcomingTab && upcomingDues.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm"><h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Next 7 Days Dues</h4><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{upcomingDues.map((item) => <div key={item._id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between"><div><p className="text-xs font-bold text-slate-800">{item.studentName}</p><p className="text-[10px] text-slate-500">{item.batchName} • Due {new Date(item.dueDate).toLocaleDateString()}</p></div><div className="text-right"><span className="text-xs font-extrabold text-amber-700">₹{item.remainingAmount?.toLocaleString()}</span></div></div>)}</div></div>
                )}

                {/* Filter Bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="relative lg:col-span-2"><span className="absolute inset-y-0 left-3 flex items-center text-slate-400"><FaSearch size={12} /></span><input type="text" placeholder="Search by student name" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
                        <div><select value={selectedMonth} onChange={(e) => { const val = e.target.value === 'all' ? 'all' : Number(e.target.value); setSelectedMonth(val); setPage(1); }} className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"><option value="all">All months</option>{MONTHS.map(m => <option key={m.value} value={m.value}>{m.label} {selectedYear}</option>)}</select></div>
                        <div><select value={selectedBatch} onChange={(e) => { setSelectedBatch(e.target.value); setPage(1); }} className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"><option value="">All batches</option>{batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}</select></div>
                        <div><select value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }} className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"><option value="all">All statuses</option><option value="paid">Paid</option><option value="partially_paid">Partially paid</option><option value="pending">Pending</option><option value="overdue">Overdue</option></select></div>
                    </div>
                    <div className="flex justify-end mt-3 pt-3 border-t border-slate-100"><button onClick={handleExportCSV} className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl text-white bg-[#134e4a] hover:bg-[#115e59] transition-colors shadow-sm cursor-pointer"><FaDownload size={11} /> Export CSV</button></div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {loading ? <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-600"></div></div> : fees.length === 0 ? <div className="text-center py-16 px-4"><p className="text-xs font-semibold text-slate-400">No student fee records found.</p></div> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead><tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider"><th className="py-3.5 px-6">Student</th><th className="py-3.5 px-6">Batch</th><th className="py-3.5 px-6">Inst. #</th><th className="py-3.5 px-6">Amount</th><th className="py-3.5 px-6">Paid</th><th className="py-3.5 px-6">Balance</th><th className="py-3.5 px-6">Status</th><th className="py-3.5 px-6">Due date</th><th className="py-3.5 px-6 text-center">Action</th></tr></thead>
                                <tbody className="divide-y divide-slate-100 text-xs">{fees.map((fee) => { const balance = fee.amount - fee.amountPaid; return (<tr key={fee._id} className="hover:bg-slate-50/50 transition-colors"><td className="py-4 px-6 font-bold text-slate-800">{fee.student?.name || 'Unknown'}</td><td className="py-4 px-6 font-semibold text-teal-700">{fee.batch?.name || 'Unassigned'}</td><td className="py-4 px-6 font-medium text-slate-500">#{fee.installmentNumber || 1}</td><td className="py-4 px-6 font-bold text-slate-800">₹{fee.amount?.toLocaleString()}</td><td className="py-4 px-6 font-bold text-emerald-600">₹{fee.amountPaid?.toLocaleString()}</td><td className="py-4 px-6 font-bold text-rose-600">₹{balance?.toLocaleString()}</td><td className="py-4 px-6">{renderStatusPill(fee.status)}</td><td className="py-4 px-6 font-medium text-slate-500">{new Date(fee.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td className="py-4 px-6 text-center"><div className="flex items-center justify-center gap-3 text-xs font-semibold">{fee.status !== 'paid' && balance > 0 && <button onClick={() => handleOpenRecordModal(fee)} className="text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 transition-colors cursor-pointer"><FaCreditCard size={11} /> Record payment</button>}<button onClick={() => handleOpenHistoryModal(fee)} className="text-teal-700 hover:text-teal-900 flex items-center gap-1.5 transition-colors cursor-pointer"><FaHistory size={11} /> History</button><button onClick={() => handleDeleteFee(fee._id)} title="Delete Fee Record" className="text-rose-500 hover:text-rose-700 p-1 transition-colors cursor-pointer"><FaTrash size={11} /></button></div></td></tr>); })}</tbody>
                            </table>
                        </div>
                    )}
                    {totalPages > 1 && <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 disabled:opacity-50 cursor-pointer">Previous</button><span className="text-xs font-semibold text-slate-500">Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 disabled:opacity-50 cursor-pointer">Next</button></div>}
                </div>
            </div>

            {showRecordModal && currentFeeForRecord && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-100 shadow-2xl relative">
                        <button onClick={() => setShowRecordModal(false)} className="absolute top-6 right-6 text-slate-400"><FaTimes size={16} /></button>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-4">Record Payment</h2>
                        <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
                            <div><label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Payment Amount (₹)</label><input type="number" required min="1" max={currentFeeForRecord.amount - currentFeeForRecord.amountPaid} className="w-full px-4 py-2.5 text-slate-800 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500" value={recordForm.amount} onChange={e => setRecordForm({ ...recordForm, amount: e.target.value })} /></div>
                            <div><label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Payment Mode</label><select className="w-full px-4 py-2.5 text-slate-800 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer" value={recordForm.paymentMode} onChange={e => setRecordForm({ ...recordForm, paymentMode: e.target.value })}><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="online">Online Transfer</option><option value="cheque">Cheque</option></select></div>
                            <div><label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Note / Reference (Optional)</label><input type="text" placeholder="e.g. Receipt #123, Bank Txn ID" className="w-full px-4 py-2.5 text-slate-800 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500" value={recordForm.note} onChange={e => setRecordForm({ ...recordForm, note: e.target.value })} /></div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100"><button type="button" onClick={() => setShowRecordModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600">Cancel</button><button type="submit" disabled={submitting} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer">{submitting ? 'Recording...' : 'Confirm Payment'}</button></div>
                        </form>
                    </div>
                </div>
            )}

            {showHistoryModal && currentFeeForHistory && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-2xl w-full border border-slate-100 shadow-2xl relative max-h-[85vh] overflow-y-auto">
                        <button onClick={() => setShowHistoryModal(false)} className="absolute top-6 right-6 text-slate-400"><FaTimes size={16} /></button>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-1">Payment History</h2>
                        <p className="text-xs text-slate-400 font-medium mb-6">Student: <strong className="text-slate-700">{currentFeeForHistory.student?.name}</strong> | Total: <strong>₹{currentFeeForHistory.amount?.toLocaleString()}</strong> | Paid: <strong className="text-emerald-600">₹{currentFeeForHistory.amountPaid?.toLocaleString()}</strong></p>
                        {(!currentFeeForHistory.paymentHistory || currentFeeForHistory.paymentHistory.length === 0) ? <p className="text-xs text-slate-400 italic py-6 text-center">No records.</p> : (
                            <div className="space-y-3">{currentFeeForHistory.paymentHistory.map((entry) => { const isEditing = editingPaymentEntry === entry._id; return (<div key={entry._id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-2">{isEditing ? (<div className="space-y-3"><div className="grid grid-cols-2 gap-3"><div><label className="block text-[10px] font-bold text-slate-500 uppercase">Amount (₹)</label><input type="number" value={editEntryForm.amount} onChange={e => setEditEntryForm({ ...editEntryForm, amount: e.target.value })} className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold" /></div><div><label className="block text-[10px] font-bold text-slate-500 uppercase">Mode</label><select value={editEntryForm.paymentMode} onChange={e => setEditEntryForm({ ...editEntryForm, paymentMode: e.target.value })} className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold"><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="online">Online</option><option value="cheque">Cheque</option></select></div></div><div><label className="block text-[10px] font-bold text-slate-500 uppercase">Note</label><input type="text" value={editEntryForm.note} onChange={e => setEditEntryForm({ ...editEntryForm, note: e.target.value })} className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold" /></div><div className="flex justify-end gap-2 pt-2"><button onClick={() => setEditingPaymentEntry(null)} className="px-3 py-1 text-xs font-semibold text-slate-500">Cancel</button><button onClick={() => handleSaveEditEntry(entry._id)} className="px-3 py-1 text-xs font-bold bg-teal-600 text-white rounded-lg">Save</button></div></div>) : (<div className="flex items-center justify-between"><div><span className="text-sm font-extrabold text-emerald-700">₹{entry.amount?.toLocaleString()}</span><span className="text-[10px] uppercase font-bold text-slate-400 ml-2">via {entry.mode || 'cash'}</span><p className="text-[11px] text-slate-400 mt-0.5">{new Date(entry.date).toLocaleString()}</p>{entry.note && <p className="text-xs text-slate-600 font-medium italic mt-1">&quot;{entry.note}&quot;</p>}</div><div className="flex items-center gap-2"><button onClick={() => handleStartEditEntry(entry)} className="px-2.5 py-1 text-xs font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg">Edit</button><button onClick={() => handleUndoPayment(entry._id)} className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg">Undo</button></div></div>)}</div>); })}</div>
                        )}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default FeeManagement;
