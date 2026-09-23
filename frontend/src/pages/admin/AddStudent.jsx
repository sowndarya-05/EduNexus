import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaEye, FaEyeSlash } from 'react-icons/fa';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/ui/Button';
import API from '../../api';

const AddStudent = () => {
    const [user] = useState(() => {
        const saved = sessionStorage.getItem('user') || localStorage.getItem('user');
        try {
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        parentEmail: '',
        parentPassword: '',
        batch: ''
    });

    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const batchesRes = await API.get('/admin/batches');
                setBatches(Array.isArray(batchesRes.data) ? batchesRes.data : []);

                if (isEdit) {
                    const { data } = await API.get(`/students/${id}`);
                    setFormData({
                        name: data.studentName || data.name || '',
                        email: data.email || '',
                        parentEmail: data.parentEmail || data.parent?.email || '',
                        parentPassword: '',
                        batch: data.batch?._id || data.batch || ''
                    });
                }
            } catch (error) {
                console.error('Failed to fetch data', error);
                alert('Error loading form data');
            } finally {
                setFetching(false);
            }
        };
        fetchData();
    }, [id, isEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEdit) {
                await API.put(`/students/${id}`, formData);
            } else {
                await API.post('/students', formData);
            }
            navigate('/admin/students');
        } catch (error) {
            console.error('Failed to save student', error);
            alert(error.response?.data?.message || 'Error saving student');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <DashboardLayout user={user}>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout user={user}>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <button
                        onClick={() => navigate('/admin/students')}
                        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-fit text-sm font-semibold cursor-pointer"
                    >
                        <FaArrowLeft /> Back to Students
                    </button>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                        {isEdit ? 'Edit Student Profile' : 'Add New Student'}
                    </h1>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-premium p-6 sm:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all text-sm font-semibold"
                                    placeholder="Enter student's full name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-4 py-2.5 text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all text-sm font-semibold"
                                    placeholder="Enter email address"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Parent Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-4 py-2.5 text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all text-sm font-semibold"
                                    placeholder="Enter parent's email address"
                                    value={formData.parentEmail}
                                    onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                                />
                                <p className="text-[10px] text-slate-400 font-medium">
                                    The student will be linked to the parent account with this email address.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Parent Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required={!isEdit}
                                        className="w-full pl-4 pr-12 py-2.5 text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all text-sm font-semibold"
                                        placeholder={isEdit ? "Enter to change password" : "Set login password for parent"}
                                        value={formData.parentPassword}
                                        onChange={(e) => setFormData({ ...formData, parentPassword: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                        {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">
                                    This password will be used by the parent to sign in.
                                </p>
                            </div>



                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Assign Batch</label>
                                <select
                                    required
                                    className="w-full px-4 py-2.5 text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all text-sm font-semibold"
                                    value={formData.batch}
                                    onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                                >
                                    <option value="">Select a batch</option>
                                    {batches.map(batch => (
                                        <option key={batch._id} value={batch._id}>
                                            {batch.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end border-t border-slate-100 mt-6">
                            <Button
                                type="submit"
                                variant="primary"
                                loading={loading}
                                className="px-8 shadow-lg shadow-indigo-600/10"
                            >
                                <FaSave className="mr-2" /> {isEdit ? 'Update Student' : 'Add Student'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AddStudent;
