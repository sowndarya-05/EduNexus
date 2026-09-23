import { useState, useEffect, useRef } from 'react';
import { 
    FaSearch, FaEnvelope, FaPaperPlane, FaClock, 
    FaUserFriends, FaCircle, FaUserGraduate, FaComments, FaCheck
} from 'react-icons/fa';
import DashboardLayout from '../../components/layout/DashboardLayout';
import API from '../../api';

const Messages = () => {
    const [user] = useState(() => {
        const saved = sessionStorage.getItem('user');
        try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
    });

    const [parents, setParents] = useState([]);
    const [selectedParent, setSelectedParent] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [chatHistory, setChatHistory] = useState([]);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [loadingChat, setLoadingChat] = useState(false);

    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchContacts();
    }, []);

    useEffect(() => {
        if (selectedParent) {
            fetchConversation(selectedParent._id);
        }
    }, [selectedParent]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const fetchContacts = async () => {
        try {
            setLoadingContacts(true);
            const { data } = await API.get('/messages/contacts');
            const contactList = Array.isArray(data) ? data : [];
            setParents(contactList);
            if (contactList.length > 0) setSelectedParent(contactList[0]);
        } catch (error) {
            console.error('Failed to fetch parent contacts', error);
        } finally { setLoadingContacts(false); }
    };

    const fetchConversation = async (parentId) => {
        try {
            setLoadingChat(true);
            const { data } = await API.get(`/messages/${parentId}`);
            setChatHistory(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch conversation', error);
        } finally { setLoadingChat(false); }
    };

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!message.trim() || !selectedParent || sending) return;
        try {
            setSending(true);
            const { data: newMsg } = await API.post('/messages', {
                receiverId: selectedParent._id,
                text: message.trim()
            });
            setChatHistory(prev => [...prev, newMsg]);
            setMessage('');
        } catch (error) {
            console.error('Failed to send message', error);
        } finally { setSending(false); }
    };

    const filteredParents = parents.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.children?.some(c => c.studentName?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <DashboardLayout user={user}>
            <div className="max-w-7xl mx-auto space-y-5 pb-8">
                {/* Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                            <span className="w-2.5 h-6 bg-teal-600 rounded-full"></span>
                            Parent Communications
                        </h1>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            Direct, secure messaging channel with guardians of scholars in your batches
                        </p>
                    </div>
                </div>

                {/* 2-Column Chat Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-14rem)] min-h-[550px]">
                    {/* Contacts Directory (4 cols) */}
                    <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/70 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Parent Directory ({parents.length})
                                </h3>
                            </div>
                            <div className="relative">
                                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                                <input
                                    type="text"
                                    placeholder="Search parent or scholar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                            {loadingContacts ? (
                                <div className="flex justify-center items-center h-48">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-600" />
                                </div>
                            ) : filteredParents.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-center p-6 text-slate-400 space-y-2">
                                    <FaUserFriends size={28} className="text-slate-300" />
                                    <p className="text-xs font-bold text-slate-600">No parent contacts</p>
                                    <p className="text-[11px] text-slate-400">No matching contacts linked to your batches.</p>
                                </div>
                            ) : (
                                filteredParents.map(parent => {
                                    const isSelected = selectedParent?._id === parent._id;
                                    return (
                                        <div
                                            key={parent._id}
                                            onClick={() => setSelectedParent(parent)}
                                            className={`flex items-center gap-3 p-3.5 cursor-pointer transition-colors ${
                                                isSelected 
                                                    ? 'bg-teal-50/70 border-l-4 border-l-teal-600' 
                                                    : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm ${
                                                isSelected ? 'bg-teal-600' : 'bg-slate-700'
                                            }`}>
                                                {parent.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-slate-800 text-xs truncate leading-snug">{parent.name}</p>
                                                {parent.children && parent.children.length > 0 && (
                                                    <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5">
                                                        <FaUserGraduate size={9} className="text-teal-600 shrink-0" />
                                                        <span>{parent.children.map(c => c.studentName).join(', ')}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Chat Conversation Pane (8 cols) */}
                    <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/70 shadow-sm flex flex-col overflow-hidden">
                        {/* Conversation Header */}
                        {selectedParent ? (
                            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                                        {selectedParent.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm leading-tight">{selectedParent.name}</h3>
                                        <p className="text-[11px] text-slate-500 font-medium">
                                            Parent of: <strong className="text-slate-700">{selectedParent.children?.map(c => c.studentName).join(', ') || 'Scholar'}</strong>
                                        </p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                    <FaCircle size={6} className="text-emerald-500" /> Active Session
                                </span>
                            </div>
                        ) : (
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                                <p className="text-xs font-semibold text-slate-400">Select a parent contact to start messaging</p>
                            </div>
                        )}

                        {/* Chat Messages Feed */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-slate-50/40">
                            {loadingChat ? (
                                <div className="flex justify-center items-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-600" />
                                </div>
                            ) : !selectedParent ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-2">
                                    <FaComments size={36} className="text-slate-300" />
                                    <p className="text-sm font-bold text-slate-600">No Conversation Selected</p>
                                    <p className="text-xs text-slate-400">Select a parent from the directory to review and send messages.</p>
                                </div>
                            ) : chatHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-2">
                                    <FaEnvelope size={32} className="text-slate-300" />
                                    <p className="text-sm font-bold text-slate-600">Start of Conversation</p>
                                    <p className="text-xs text-slate-400">No message history yet. Send a direct message below.</p>
                                </div>
                            ) : (
                                chatHistory.map((msg, index) => {
                                    const isMe = msg.sender?._id === user?._id || msg.sender === user?._id;
                                    const isAssessmentResult = msg.text && msg.text.startsWith('📚 Assessment Result');

                                    return (
                                        <div key={msg._id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
                                                {isAssessmentResult ? (
                                                    <div className="bg-white border-2 border-indigo-200 rounded-2xl p-4 shadow-sm text-left space-y-2">
                                                        <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-xs">
                                                            <span className="text-base">📚</span> Automated Assessment Notification
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
                                    placeholder={selectedParent ? `Message ${selectedParent.name}... (Press Enter)` : "Select a parent to send a message"}
                                    disabled={!selectedParent || sending}
                                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                                />
                                <button
                                    type="submit"
                                    disabled={!selectedParent || !message.trim() || sending}
                                    className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 gap-1.5 shadow-sm"
                                >
                                    <FaPaperPlane size={11} />
                                    <span>{sending ? 'Sending...' : 'Send'}</span>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Messages;

