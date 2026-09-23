import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    FaMoneyBillWave, FaFileInvoiceDollar, FaCheckCircle, 
    FaClock, FaUserGraduate, FaChevronLeft, FaCreditCard, FaShieldAlt
} from 'react-icons/fa';
import DashboardLayout from '../../components/layout/DashboardLayout';
import API from '../../api';

const FeeDetails = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [user] = useState(() => {
        const saved = sessionStorage.getItem('user') || localStorage.getItem('user');
        try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
    });

    const [students, setStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState(location.state?.studentId || '');
    const [feeHistory, setFeeHistory] = useState([]);
    const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0, childName: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChildren();
    }, []);

    useEffect(() => {
        if (selectedStudentId) {
            fetchFees();
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

    const fetchFees = async () => {
        try {
            setLoading(true);
            const { data: payments } = await API.get(`/payments?studentId=${selectedStudentId}`);
            const currentStudent = students.find(s => s._id === selectedStudentId);

            const totalFee = currentStudent?.fees?.totalAmount || currentStudent?.totalFees || 0;
            const paidAmount = currentStudent?.fees?.paidAmount !== undefined 
                ? currentStudent.fees.paidAmount 
                : (Array.isArray(payments) ? payments.reduce((sum, p) => sum + (p.amount || 0), 0) : 0);
            const pendingBalance = Math.max(0, totalFee - paidAmount);

            setFeeHistory(Array.isArray(payments) ? payments : []);
            setStats({
                total: totalFee,
                paid: paidAmount,
                pending: pendingBalance,
                childName: currentStudent?.name || ''
            });
        } catch (error) {
            console.error('Failed to fetch fees', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadReceipt = (item) => {
        const receiptContent = `
=====================================================
            EDUNEXUS AI - OFFICIAL RECEIPT
=====================================================
Transaction ID   : ${item._id}
Issue Date       : ${new Date(item.createdAt || item.date).toLocaleDateString()}
Student Name     : ${stats.childName}
Settled Amount   : INR ₹${item.amount?.toLocaleString()}
Payment Method   : ${(item.paymentMethod || 'Online').toUpperCase()}
Status           : VERIFIED / SETTLED
-----------------------------------------------------
Institution      : EduNexus AI Academic Platform
Timestamp        : ${new Date().toLocaleString()}
=====================================================
`;
        const blob = new Blob([receiptContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Receipt_${item._id.slice(-8)}.txt`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const selectedStudent = students.find(s => s._id === selectedStudentId) || students[0];

    return (
        <DashboardLayout user={user}>
            <div className="max-w-6xl mx-auto space-y-8 py-2 pb-16">
                
                {/* ── 1. Page Header with Breadcrumb & Student Selector ── */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm">
                    <div className="space-y-1">
                        <button
                            onClick={() => navigate('/parent')}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer mb-1"
                        >
                            <FaChevronLeft size={9} /> Back to Dashboard
                        </button>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                            Fees & Billing Statement
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                            Official institutional tuition summary, payment history, and tax invoices.
                        </p>
                    </div>

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
                </div>

                {/* ── 2. Fee Summary Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {/* Total Program Fee */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Program Fee</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-2">
                            ₹{stats.total.toLocaleString()}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">Annual tuition assessment</p>
                    </div>

                    {/* Settled / Paid Amount */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Settled Amount</p>
                        <h3 className="text-3xl font-extrabold text-emerald-600 tracking-tight mt-2">
                            ₹{stats.paid.toLocaleString()}
                        </h3>
                        <p className="text-xs text-emerald-700 font-semibold mt-1">✓ Verified collections</p>
                    </div>

                    {/* Outstanding Balance */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Outstanding Balance</p>
                        <h3 className="text-3xl font-extrabold text-indigo-600 tracking-tight mt-2">
                            ₹{stats.pending.toLocaleString()}
                        </h3>
                        <p className={`text-xs font-bold mt-1 ${stats.pending === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {stats.pending === 0 ? '✓ Account fully settled' : 'Payment pending'}
                        </p>
                    </div>
                </div>

                {/* ── 3. Outstanding Payment Alert / Status Banner ── */}
                {stats.pending > 0 ? (
                    <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <FaClock size={16} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-amber-900">Tuition Installment Pending</h4>
                                <p className="text-xs text-amber-700 font-medium mt-0.5">
                                    An outstanding balance of ₹{stats.pending.toLocaleString()} is currently due for {selectedStudent?.name || 'your child'}.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => alert("Please contact the academy office or scan the official UPI QR at reception to settle tuition dues.")}
                            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
                        >
                            Payment Instructions →
                        </button>
                    </div>
                ) : (
                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <FaCheckCircle size={16} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-emerald-900">All Tuition Accounts Cleared</h4>
                            <p className="text-xs text-emerald-700 font-medium mt-0.5">
                                No pending tuition fees or overdue balances for {selectedStudent?.name || 'your child'}.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── 4. Verified Transaction Ledger ── */}
                <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                        <h2 className="text-sm font-bold text-slate-800">
                            Payment History Ledger ({feeHistory.length} receipts)
                        </h2>
                        <span className="text-xs text-slate-400 font-medium">
                            Verified institutional receipts
                        </span>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-3"></div>
                            <p className="text-xs text-slate-400 font-medium">Loading ledger...</p>
                        </div>
                    ) : feeHistory.length === 0 ? (
                        <div className="p-16 text-center space-y-2">
                            <FaFileInvoiceDollar size={32} className="text-slate-300 mx-auto" />
                            <h3 className="text-sm font-bold text-slate-700">No Payment Records Yet</h3>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                Transaction receipts will appear here once fee payments are confirmed and settled.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                                        <th className="px-6 py-3.5">Payment Method / ID</th>
                                        <th className="px-6 py-3.5">Settled Date</th>
                                        <th className="px-6 py-3.5">Amount</th>
                                        <th className="px-6 py-3.5">Status</th>
                                        <th className="px-6 py-3.5 text-right">Audit Receipt</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {feeHistory.map((item, index) => (
                                        <tr key={item._id || index} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-800 capitalize">
                                                    {item.paymentMethod || 'Institutional Payment'}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                    REF: #{item._id?.slice(-8)?.toUpperCase()}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">
                                                {new Date(item.createdAt || item.date).toLocaleDateString(undefined, { 
                                                    day: 'numeric', 
                                                    month: 'short', 
                                                    year: 'numeric' 
                                                })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-extrabold text-slate-900 text-sm">
                                                    ₹{item.amount?.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <FaCheckCircle size={9} /> Settled
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => downloadReceipt(item)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 transition-colors cursor-pointer"
                                                >
                                                    <FaFileInvoiceDollar size={11} /> Download Receipt
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </DashboardLayout>
    );
};

export default FeeDetails;
