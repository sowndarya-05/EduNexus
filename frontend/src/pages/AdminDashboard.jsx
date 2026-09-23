import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaUserGraduate, FaChalkboardTeacher, FaLayerGroup,
    FaMoneyBillWave, FaBell, FaUserPlus,
    FaCalendarCheck, FaExclamationTriangle,
    FaFileExcel, FaFilePdf, FaDownload
} from 'react-icons/fa';
import DashboardLayout from '../components/layout/DashboardLayout';
import API from '../api';

const AdminDashboard = () => {
    const [user] = useState(() => JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}'));
    const [summary, setSummary] = useState({
        activeStudents: 0,
        todayAttendancePercent: 0,
        feesCollectedThisMonth: 0,
        studentsAtRisk: 0,
        runningBatches: 0,
        totalTeachers: 0
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDashboardSummary();
    }, []);

    const fetchDashboardSummary = async () => {
        try {
            setLoading(true);
            const { data } = await API.get('/admin/dashboard/summary');
            setSummary(data);
        } catch (error) {
            console.error('Failed to fetch admin dashboard summary', error);
        } finally {
            setLoading(false);
        }
    };

    const triggerFileDownload = (blobData, defaultFilename) => {
        const url = window.URL.createObjectURL(new Blob([blobData]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', defaultFilename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };

    // Quick Report Download handlers — calls API with blob response
    const downloadAttendanceReport = async () => {
        try {
            const response = await API.get('/admin/reports/attendance-pdf', { responseType: 'blob' });
            triggerFileDownload(response.data, `Monthly_Attendance_Report_${Date.now()}.pdf`);
        } catch (error) {
            console.error('Failed to download attendance report', error);
            alert('Failed to download attendance report.');
        }
    };

    const downloadFeeReport = async () => {
        try {
            const response = await API.get('/admin/fees/export?status=all', { responseType: 'blob' });
            triggerFileDownload(response.data, `Fee_Collection_Report_${Date.now()}.xlsx`);
        } catch (error) {
            console.error('Failed to download fee report', error);
            alert('Failed to download fee report.');
        }
    };

    const downloadBatchReport = async () => {
        try {
            const response = await API.get('/admin/reports/batch-performance-pdf', { responseType: 'blob' });
            triggerFileDownload(response.data, `Batch_Performance_Report_${Date.now()}.pdf`);
        } catch (error) {
            console.error('Failed to download batch report', error);
            alert('Failed to download batch report.');
        }
    };

    if (loading) return (
        <DashboardLayout user={user}>
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout user={user}>
            <div className="space-y-8">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Administrator Console</h1>
                        <p className="text-sm text-slate-400 font-medium mt-1">Real-time operational summary & metrics overview.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={fetchDashboardSummary}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/10 cursor-pointer"
                        >
                            Refresh Summary
                        </button>
                    </div>
                </div>

                {/* Top 6 KPI Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* 1. Total Active Students */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-premium hover:shadow-premium-hover transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Students</span>
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-base">
                                <FaUserGraduate />
                            </div>
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-4">{summary.activeStudents}</h2>
                        <p className="text-xs font-medium text-slate-400 mt-1">Total active student roster</p>
                    </div>

                    {/* 2. Today's Attendance Percentage */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-premium hover:shadow-premium-hover transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Today's Attendance</span>
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-base">
                                <FaCalendarCheck />
                            </div>
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-4">{summary.todayAttendancePercent}%</h2>
                        <p className="text-xs font-medium text-slate-400 mt-1">Across all active batches today</p>
                    </div>

                    {/* 3. Fees Collected This Month */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-premium hover:shadow-premium-hover transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fees This Month</span>
                            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-base">
                                <FaMoneyBillWave />
                            </div>
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-4">₹{summary.feesCollectedThisMonth?.toLocaleString()}</h2>
                        <p className="text-xs font-medium text-slate-400 mt-1">Collected in current calendar month</p>
                    </div>

                    {/* 4. Students at Risk */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-premium hover:shadow-premium-hover transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Students at Risk</span>
                            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center text-base">
                                <FaExclamationTriangle />
                            </div>
                        </div>
                        <h2 className="text-3xl font-extrabold text-rose-600 tracking-tight mt-4">{summary.studentsAtRisk}</h2>
                        <p className="text-xs font-medium text-slate-400 mt-1">High & Medium risk level students</p>
                    </div>

                    {/* 5. Running Batches */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-premium hover:shadow-premium-hover transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Running Batches</span>
                            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-base">
                                <FaLayerGroup />
                            </div>
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-4">{summary.runningBatches}</h2>
                        <p className="text-xs font-medium text-slate-400 mt-1">Active scheduled learning batches</p>
                    </div>

                    {/* 6. Number of Teachers */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-premium hover:shadow-premium-hover transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Teachers</span>
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-base">
                                <FaChalkboardTeacher />
                            </div>
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mt-4">{summary.totalTeachers}</h2>
                        <p className="text-xs font-medium text-slate-400 mt-1">Faculty & instructor count</p>
                    </div>
                </div>

                {/* Secondary Grid — Quick Actions + Quick Reports */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Quick Management Navigation */}
                    <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-100 shadow-premium">
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-6">Quick Actions</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div
                                onClick={() => navigate('/admin/teachers')}
                                className="group p-5 bg-slate-50 hover:bg-white rounded-xl cursor-pointer border border-transparent hover:border-slate-100 hover:shadow-md transition-all duration-200"
                            >
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                                    <FaUserPlus size={18} />
                                </div>
                                <h4 className="font-semibold text-slate-800 text-sm">Add Teacher</h4>
                                <p className="text-xs text-slate-400 mt-1 font-medium">Create faculty account</p>
                            </div>
                            <div
                                onClick={() => navigate('/admin/students')}
                                className="group p-5 bg-slate-50 hover:bg-white rounded-xl cursor-pointer border border-transparent hover:border-slate-100 hover:shadow-md transition-all duration-200"
                            >
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                                    <FaUserGraduate size={18} />
                                </div>
                                <h4 className="font-semibold text-slate-800 text-sm">Enroll Student</h4>
                                <p className="text-xs text-slate-400 mt-1 font-medium">Register student & parent</p>
                            </div>
                            <div
                                onClick={() => navigate('/admin/batches')}
                                className="group p-5 bg-slate-50 hover:bg-white rounded-xl cursor-pointer border border-transparent hover:border-slate-100 hover:shadow-md transition-all duration-200"
                            >
                                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                                    <FaLayerGroup size={18} />
                                </div>
                                <h4 className="font-semibold text-slate-800 text-sm">Create Batch</h4>
                                <p className="text-xs text-slate-400 mt-1 font-medium">Schedule class batch</p>
                            </div>
                            <div
                                onClick={() => navigate('/admin/fees')}
                                className="group p-5 bg-slate-50 hover:bg-white rounded-xl cursor-pointer border border-transparent hover:border-slate-100 hover:shadow-md transition-all duration-200"
                            >
                                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                                    <FaMoneyBillWave size={18} />
                                </div>
                                <h4 className="font-semibold text-slate-800 text-sm">Fee Management</h4>
                                <p className="text-xs text-slate-400 mt-1 font-medium">Track payments & fees</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Reports Card */}
                    <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-100 shadow-premium">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                <FaDownload size={16} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Quick Reports</h3>
                        </div>
                        <div className="space-y-3">
                            {/* Monthly Attendance Report - PDF */}
                            <button
                                onClick={downloadAttendanceReport}
                                className="group w-full p-4 bg-slate-50 hover:bg-blue-50 rounded-xl cursor-pointer border border-transparent hover:border-blue-100 hover:shadow-sm transition-all duration-200 flex items-center gap-4 text-left"
                            >
                                <div className="w-10 h-10 bg-blue-50 text-blue-600 group-hover:bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                                    <FaFilePdf size={18} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 text-sm">Monthly Attendance Report</h4>
                                    <p className="text-xs text-slate-400 mt-0.5 font-medium">Download as PDF</p>
                                </div>
                            </button>

                            {/* Fee Collection Report - Excel */}
                            <button
                                onClick={downloadFeeReport}
                                className="group w-full p-4 bg-slate-50 hover:bg-emerald-50 rounded-xl cursor-pointer border border-transparent hover:border-emerald-100 hover:shadow-sm transition-all duration-200 flex items-center gap-4 text-left"
                            >
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                                    <FaFileExcel size={18} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 text-sm">Fee Collection Report</h4>
                                    <p className="text-xs text-slate-400 mt-0.5 font-medium">Download as Excel (.xlsx)</p>
                                </div>
                            </button>

                            {/* Batch Performance Report - PDF */}
                            <button
                                onClick={downloadBatchReport}
                                className="group w-full p-4 bg-slate-50 hover:bg-purple-50 rounded-xl cursor-pointer border border-transparent hover:border-purple-100 hover:shadow-sm transition-all duration-200 flex items-center gap-4 text-left"
                            >
                                <div className="w-10 h-10 bg-purple-50 text-purple-600 group-hover:bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                                    <FaFilePdf size={18} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 text-sm">Batch Performance Report</h4>
                                    <p className="text-xs text-slate-400 mt-0.5 font-medium">Download as PDF</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminDashboard;
