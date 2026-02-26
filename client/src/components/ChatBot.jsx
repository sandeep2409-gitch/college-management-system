import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, User, Loader2, Bot, Plus, ArrowUp, Zap, ChevronRight, Share2, MoreHorizontal, Clock, FileText } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ChatBot = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (customInput) => {
        const messageToSend = customInput || input;
        if (!messageToSend.trim() || isLoading) return;

        const userMessage = {
            role: 'user',
            text: messageToSend,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const history = messages.map(msg => ({
                role: msg.role === 'bot' ? 'model' : 'user',
                parts: [{ text: msg.text }]
            }));

            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/chat`, {
                message: messageToSend,
                history: history,
                userContext: user ? { name: user.name, role: user.role, id: user.id } : null
            });

            const botMessage = {
                role: 'bot',
                text: response.data.message,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'bot',
                text: 'I encountered an issue connecting to the campus core. Please try again later.',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderText = (text) => {
        // Simple markdown-style rendering for ChatGPT feel
        const parts = text.split(/(\*\*.*?\*\*|```.*?```)/s);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('```') && part.endsWith('```')) {
                return (
                    <pre key={i} className="bg-[#0d0d0d] p-4 rounded-xl my-3 font-mono text-xs text-green-400 overflow-x-auto border border-white/5">
                        {part.slice(3, -3)}
                    </pre>
                );
            }
            return <span key={i} className="whitespace-pre-wrap">{part}</span>;
        });
    };

    return (
        <div className="fixed bottom-6 right-6 z-[1001]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 15 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                        className="mb-4 w-[calc(100vw-40px)] sm:w-[400px] h-[600px] max-h-[75vh] bg-[#242424] text-[#f2f2f2] rounded-2xl shadow-xl border border-white/5 flex flex-col overflow-hidden z-[1002]"
                    >
                        {/* Header - Minimal Gray */}
                        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#2a2a2a]">
                            <div className="flex flex-col ml-2">
                                <h3 className="text-[13px] font-bold text-white tracking-wide">Campus AI</h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-1 h-1 bg-[#10a37f] rounded-full" />
                                    <span className="text-[8px] text-white/30 font-bold uppercase tracking-widest">Active</span>
                                </div>
                            </div>
                        </div>

                        {/* Messages Area - Pure & Gray */}
                        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 custom-scrollbar bg-[#242424]">
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center px-6">
                                    <p className="text-white/30 text-xs mb-8 uppercase tracking-[0.2em] font-bold">New Conversation</p>
                                    
                                    <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
                                        {[
                                            { icon: Zap, text: 'Check Attendance', query: 'Get my attendance' },
                                            { icon: Clock, text: 'Class Schedule', query: 'My timetable' },
                                            { icon: FileText, text: 'Study Notes', query: 'Academic resources' }
                                        ].map((item, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => handleSend(item.query)}
                                                className="p-3 bg-white/5 border border-white/5 rounded-xl text-left hover:bg-white/10 transition-all flex items-center gap-3 group"
                                            >
                                                <item.icon size={14} className="text-[#10a37f]/50" />
                                                <span className="text-xs font-medium text-white/50 group-hover:text-white">{item.text}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                                        msg.role === 'bot' ? 'bg-[#3a3a3a] text-[#10a37f]' : 'bg-white/10 text-white/80'
                                    }`}>
                                        {msg.role === 'bot' ? <Bot size={16} /> : <User size={16} />}
                                    </div>
                                    <div className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
                                            msg.role === 'user' 
                                                ? 'bg-[#10a37f] text-white' 
                                                : 'bg-[#2a2a2a] text-white/90 border border-white/5'
                                        }`}>
                                            {renderText(msg.text)}
                                        </div>
                                        <span className="text-[9px] text-white/10 font-bold px-1 uppercase tracking-tighter">{msg.time}</span>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#3a3a3a] text-[#10a37f] flex items-center justify-center">
                                        <Bot size={16} />
                                    </div>
                                    <div className="bg-[#2a2a2a] px-4 py-3 rounded-xl flex items-center gap-1.5 border border-white/5">
                                        <div className="w-1 h-1 bg-white/20 rounded-full animate-pulse" />
                                        <div className="w-1 h-1 bg-white/20 rounded-full animate-pulse [animation-delay:0.2s]" />
                                        <div className="w-1 h-1 bg-white/20 rounded-full animate-pulse [animation-delay:0.4s]" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area - Integrated & Neutral */}
                        <div className="p-4 bg-[#2a2a2a] border-t border-white/5">
                            <div className="relative flex items-center gap-2 bg-[#1a1a1a] p-1.5 pr-2 rounded-xl border border-white/5 focus-within:border-white/10 transition-all">
                                <textarea
                                    rows="1"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="Message AI..."
                                    className="flex-1 bg-transparent py-2 px-3 text-sm text-white/80 placeholder:text-white/20 focus:outline-none resize-none"
                                    style={{ height: 'auto' }}
                                />
                                <button 
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || isLoading}
                                    className={`p-2 rounded-lg transition-all ${
                                        input.trim() ? 'bg-[#10a37f] text-white' : 'text-white/5'
                                    }`}
                                >
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} strokeWidth={3} />}
                                </button>
                            </div>
                            <div className="text-center mt-3 mb-1">
                                <span className="text-[8px] text-white/10 font-bold uppercase tracking-[0.4em]">Integrated Intelligence</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                    isOpen ? 'bg-white text-black rotate-90' : 'bg-[#10a37f] text-white'
                }`}
            >
                {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
            </motion.button>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                .animate-fade-in { animation: fadeIn 0.5s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default ChatBot;
