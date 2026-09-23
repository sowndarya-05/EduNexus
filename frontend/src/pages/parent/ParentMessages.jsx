import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaPaperPlane, FaUserTie, FaEnvelope, FaCircle, 
    FaChevronLeft, FaUserGraduate, FaCheck, FaLock
} from 'react-icons/fa';
import DashboardLayout from '../../components/layout/DashboardLayout';
import API from '../../api';

const ParentMessages = () => {
    const navigate = useNavigate();
    const [user] = useState(() => {
        const saved = sessionStorage.getItem('user');
        try {
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [teacher, setTeacher] = useState(null);
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    const [students, setStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (selectedStudentId && students.length > 0) {
            const currentStudent = students.find(s => s._id === selectedStudentId);
            setStudent(currentStudent);
            if (currentStudent?.batch?.teacher) {
                setTeacher(currentStudent.batch.teacher);
                fetchMessages(currentStudent.batch.teacher._id);
            } else {
                setTeacher(null);
                setChatHistory([]);
            }
        }
    }, [selectedStudentId, students]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const { data } = await API.get('/students');
            const list = Array.isArray(data) ? data : [];
            setStudents(list);
            if (list.length > 0) {
                setSelectedStudentId(list[0]._id);
            }
        } catch (error) {
            console.error('Failed to fetch students', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (teacherId) => {
        try {
            const { data } = await API.get(`/messages/${teacherId}`);
            setChatHistory(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch messages', error);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!message.trim() || !teacher || sending) return;

        try {
            setSending(true);
            const { data: newMessage } = await API.post('/messages', {
                receiverId: teacher._id,
                text: message.trim()
            });

            setChatHistory(prev => [...prev, newMessage]);
            setMessage('');
        } catch (error) {
            console.error('Failed to send message', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setSending(false);
        }
    };

    return (
        <DashboardLayout user={user}>
            <div className="max-w-6xl mx-auto space-y-6 py-2 pb-12">
                
                {/* ── 1. Page Header with Breadcrumb & Student Switcher ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                    <div className="space-y-0.5">
                        <button
                            onClick={() => navigate('/parent')}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer mb-1"
                        >
                            <FaChevronLeft size={9} /> Back to Dashboard
                        </button>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                            Faculty Communication
                        </h1>
                        <p className="text-xs text-slate-500 font-medium">
                            Direct, secure messaging channel between parents and assigned teachers.
                        </p>
                    </div>

                    {students.length > 1 && (
                        <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl self-start sm:self-auto">
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

                {/* ── 2. Modern Chat Panel Container ── */}
                <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden flex flex-col h-[600px]">
                    
                    {/* Faculty Profile Top Bar */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                    {teacher ? teacher.name?.charAt(0)?.toUpperCase() : <FaUserTie size={14} />}
                                </div>
                                {teacher && (
                                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"></span>
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm leading-tight">
                                    {teacher ? teacher.name : (loading ? 'Locating faculty...' : 'No Teacher Assigned')}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                        {student?.batch?.name || 'Class Batch'} · {student?.batch?.subject || 'Faculty'}
                                    </span>
                                    {teacher && (
                                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                                            <FaCircle size={6} className="text-emerald-500" /> Active Session
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                            <FaLock size={10} className="text-slate-400" />
                            <span>Encrypted Channel</span>
                        </div>
                    </div>

                    {/* Messages Feed */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                                <p className="text-xs font-semibold text-slate-400">Loading conversation...</p>
                            </div>
                        ) : !teacher ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-2">
                                <FaUserTie size={36} className="text-slate-300" />
                                <h4 className="text-sm font-bold text-slate-700">No Teacher Assigned</h4>
                                <p className="text-xs text-slate-400 max-w-sm">
                                    Your child ({student?.name}) is not currently assigned to a mentor. Please contact administration.
                                </p>
                            </div>
                        ) : chatHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-2">
                                <FaEnvelope size={36} className="text-slate-300" />
                                <h4 className="text-sm font-bold text-slate-700">Start of Conversation</h4>
                                <p className="text-xs text-slate-400 max-w-sm">
                                    Send a message to discuss your child's academic progress, attendance, or feedback.
                                </p>
                            </div>
                        ) : (
                            chatHistory.map((msg, index) => {
                                const isMe = msg.sender === user?._id || msg.sender?._id === user?._id;
                                const isAssessmentResult = msg.text && msg.text.startsWith('📚 Assessment Result');

                                return (
                                    <div key={msg._id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
                                            {isAssessmentResult ? (
                                                <div className="bg-white border-2 border-indigo-200 rounded-2xl p-4 shadow-sm text-left space-y-2">
                                                    <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-xs">
                                                        <span className="text-base">📚</span> Assessment Result Published
                                                    </div>
                                                    <div className="text-xs text-slate-700 whitespace-pre-line font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                        {msg.text.replace('📚 Assessment Result\n', '')}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={`px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                                                    isMe 
                                                        ? 'bg-indigo-600 text-white rounded-br-sm' 
                                                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-sm'
                                                }`}>
                                                    <p className="whitespace-pre-line m-0">{msg.text}</p>
                                                </div>
                                            )}
                                            <span className="text-[10px] text-slate-400 mt-1 px-1 font-medium flex items-center gap-1">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {isMe && <FaCheck size={8} className="text-indigo-600" />}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Message Composer Area */}
                    <div className="p-3.5 border-t border-slate-100 bg-white">
                        <form onSubmit={handleSend} className="flex gap-2.5 items-center">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={teacher ? `Message ${teacher.name}...` : "Channel unavailable"}
                                disabled={!teacher || sending}
                                className="flex-1 bg-slate-50 border border-slate-200/80 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 font-medium focus:outline-none transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!teacher || !message.trim() || sending}
                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shrink-0"
                            >
                                <FaPaperPlane size={11} />
                                <span className="hidden sm:inline">Send</span>
                            </button>
                        </form>
                    </div>

                </div>

            </div>
        </DashboardLayout>
    );
};

export default ParentMessages;
