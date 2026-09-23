import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLayerGroup, FaHistory, FaEdit, FaExclamationTriangle, FaCheckCircle, FaChartLine } from 'react-icons/fa';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import AIAlert from '../../components/ui/AIAlert';
import Button from '../../components/ui/Button';
import API from '../../api';

const StudentDetail = () => {
    const { id } = useParams();
    const [user] = useState(() => {
        const saved = sessionStorage.getItem('user') || localStorage.getItem('user');
        try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
    });
    const [student, setStudent] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchStudentData();
    }, [id]);

    const fetchStudentData = async () => {
        try {
            setLoading(true);
            const [studentRes, attendanceRes, paymentsRes] = await Promise.all([
                API.get(`/students/${id}`),
                API.get(`/attendance?studentId=${id}`),
                API.get(`/payments?studentId=${id}`)
            ]);

            const foundStudent = studentRes.data;
            if (!foundStudent) {
                navigate('/admin/students');
                return;
            }

            setStudent(foundStudent);
            setAttendance(Array.isArray(attendanceRes.data) ? attendanceRes.data : []);
            setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);
        } catch (error) {
            console.error('Failed to fetch student details', error);
            if (error.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    if (loading || !student) return (
        <DashboardLayout user={user}>
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        </DashboardLayout>
    );

    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    const pendingFees = (student.totalFees || 0) - totalPaid;

    return (
        <DashboardLayout user={user}>
            <div className="space-y-8">
                {/* Profile Header */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold text-2xl shadow-inner">
                            {student.name[0].toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{student.name}</h1>
                                {(student.isNew || (student.createdAt && new Date(student.createdAt) >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))) && (
                                    <span className="px-2.5 py-0.5 text-xs font-extrabold bg-blue-100 text-blue-700 rounded-full uppercase tracking-wider">
                                        New
                                    </span>
                                )}
                            </div>
                            <p className="flex items-center gap-1.5 mt-1.5 text-sm text-slate-400 font-medium">
                                <FaEnvelope size={12} />
                                <span>{student.email}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => navigate('/admin/students')} className="px-5">Back</Button>
                        <Button variant="primary" onClick={() => navigate(`/admin/students/edit/${id}`)} className="flex items-center gap-2 px-5">
                            <FaEdit size={12} /> Edit Profile
                        </Button>
                    </div>
                </div>

                {/* Risk Alert */}
                <div className="space-y-4">
                    {student.riskLevel === 'HIGH' && (
                        <AIAlert
                            variant="danger"
                            title="High Dropout Risk Detected"
                            message={`Reasons: ${student.riskReason?.join(', ')}`}
                        />
                    )}
                    {student.riskLevel === 'MEDIUM' && (
                        <AIAlert
                            variant="warning"
                            title="Moderate Risk Observed"
                            message={`Factors: ${student.riskReason?.join(', ')}`}
                        />
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Attendance" value={`${student.attendancePercentage?.toFixed(1) || 0}%`} change={student.attendancePercentage >= 75 ? "Target Met" : "Below Target"} changeType={student.attendancePercentage >= 75 ? "positive" : "negative"} icon={FaChartLine} color="blue" />
                    <StatCard label="Total Paid" value={`₹${totalPaid}`} change="Contribution" changeType="neutral" icon={FaCheckCircle} color="green" />
                    <StatCard label="Pending Fees" value={`₹${pendingFees}`} change={pendingFees > 0 ? "Outstanding" : "Cleared"} changeType={pendingFees > 0 ? "negative" : "positive"} icon={FaExclamationTriangle} color={pendingFees > 0 ? "orange" : "green"} />
                    <StatCard label="Primary Batch" value={student.batch?.name || 'N/A'} change="Active Entry" changeType="neutral" icon={FaLayerGroup} color="purple" />
                </div>

                {/* Tables Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Session Attendance Table */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-premium overflow-hidden">
                        <div className="px-6 py-5 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                            <FaHistory className="text-slate-400" />
                            <h3 className="font-bold text-slate-800 text-sm">Session Attendance</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/20">
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-widest">Participation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {attendance.slice(0, 10).map((record, idx) => {
                                        const statusLower = record.status?.toLowerCase();
                                        let tagClass = 'bg-slate-50 text-slate-600 ring-slate-500/10';
                                        if (statusLower === 'present' || statusLower === 'success') {
                                            tagClass = 'bg-emerald-50 text-emerald-700 ring-emerald-600/10';
                                        } else if (statusLower === 'absent') {
                                            tagClass = 'bg-rose-50 text-rose-700 ring-rose-600/10';
                                        } else if (statusLower === 'late') {
                                            tagClass = 'bg-amber-50 text-amber-700 ring-amber-600/10';
                                        }

                                        return (
                                            <tr key={idx} className="hover:bg-slate-50/20 transition-colors">
                                                <td className="px-6 py-3.5 text-slate-500 font-semibold">{new Date(record.date).toLocaleDateString()}</td>
                                                <td className="px-6 py-3.5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ring-1 ring-inset ${tagClass}`}>
                                                        {record.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {attendance.length === 0 && (
                                        <tr>
                                            <td colSpan="2" className="px-6 py-10 text-center text-slate-400 italic text-sm">
                                                No session logs detected.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Financial Registry Table */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-premium overflow-hidden">
                        <div className="px-6 py-5 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                            <FaHistory className="text-slate-400" />
                            <h3 className="font-bold text-slate-800 text-sm">Financial Registry</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/20">
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction Date</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {payments.slice(0, 10).map((p, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/20 transition-colors">
                                            <td className="px-6 py-3.5 text-slate-500 font-semibold">{new Date(p.date || p.paymentDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-3.5 font-bold text-slate-800">₹{p.amount}</td>
                                            <td className="px-6 py-3.5">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                                                    Verified
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {payments.length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-10 text-center text-slate-400 italic text-sm">
                                                No payment history found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default StudentDetail;
