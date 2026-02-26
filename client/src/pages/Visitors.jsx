import React, { useState, useEffect } from 'react';
import { UserPlus, Clock, CheckCircle, XCircle, Loader2, Phone, FileText, User, Search, Filter } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Visitors = () => {
    const { token, user } = useAuth();
    const isAdmin = user?.role === 'admin';
    
    const [visitors, setVisitors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const [formData, setFormData] = useState({
        name: '',
        contact: '',
        purpose: '',
        visitDate: new Date().toISOString().split('T')[0]
    });

    const fetchVisitors = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/visitors`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVisitors(response.data);
        } catch (err) {
            console.error("Failed to fetch visitors", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchVisitors();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/visitors`, formData);
            setSuccess('Visitor request submitted successfully!');
            setFormData({
                name: '',
                contact: '',
                purpose: '',
                visitDate: new Date().toISOString().split('T')[0]
            });
            if (token) fetchVisitors();
        } catch (err) {
            setError('Failed to submit request.');
        } finally {
            setSubmitting(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            const entryTime = status === 'admitted' ? new Date().toLocaleTimeString() : null;
            const exitTime = status === 'completed' ? new Date().toLocaleTimeString() : null;
            
            await axios.put(`${import.meta.env.VITE_API_URL}/api/visitors/${id}/status`, 
                { status, entryTime, exitTime },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchVisitors();
        } catch (err) {
            alert('Failed to update status');
        }
    };

    return (
        <div className="visitors-page animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Visitor Management</h1>
                    <p style={{ color: 'var(--text-dim)' }}>Track and manage external entries into the campus</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr' : '1fr 1.5fr', gap: '30px' }}>
                
                {/* Registration Form (Shown to everyone) */}
                {!isAdmin && (
                    <div className="glass-card" style={{ padding: '30px', height: 'fit-content' }}>
                        <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <UserPlus color="var(--primary)" /> Visitor Entry
                        </h3>
                        
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Visitor Name</label>
                                <input 
                                    type="text" 
                                    className="input-field" 
                                    required 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="Enter full name"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Contact Number</label>
                                <input 
                                    type="tel" 
                                    className="input-field" 
                                    required 
                                    value={formData.contact}
                                    onChange={(e) => setFormData({...formData, contact: e.target.value})}
                                    placeholder="+91 XXXXX XXXXX"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Purpose of Visit</label>
                                <textarea 
                                    className="input-field" 
                                    required 
                                    rows="3"
                                    value={formData.purpose}
                                    onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                                    placeholder="e.g., Parent meeting, Delivery, Vendor"
                                    style={{ borderRadius: '12px', padding: '12px' }}
                                ></textarea>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Date</label>
                                <input 
                                    type="date" 
                                    className="input-field" 
                                    required 
                                    value={formData.visitDate}
                                    onChange={(e) => setFormData({...formData, visitDate: e.target.value})}
                                />
                            </div>

                            {error && <p style={{ color: 'var(--error)', fontSize: '0.85rem' }}>{error}</p>}
                            {success && <p style={{ color: 'var(--success)', fontSize: '0.85rem' }}>{success}</p>}

                            <button className="btn-primary" type="submit" disabled={submitting}>
                                {submitting ? <Loader2 className="animate-spin" /> : 'Request Entry'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Visitor Log (Shown to Admins or for tracking) */}
                {(isAdmin || token) && (
                    <div className="glass-card" style={{ padding: '30px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FileText color="var(--primary)" /> Campus Entry logs
                            </h3>
                            <button onClick={fetchVisitors} className="btn-secondary" style={{ padding: '8px 15px' }}>
                                <Loader2 size={16} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" /></div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', background: 'var(--card-inner)' }}>
                                            <th style={{ padding: '15px' }}>Visitor</th>
                                            <th style={{ padding: '15px' }}>Purpose</th>
                                            <th style={{ padding: '15px' }}>Date</th>
                                            <th style={{ padding: '15px' }}>Status</th>
                                            {isAdmin && <th style={{ padding: '15px' }}>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visitors.map(visitor => (
                                            <tr key={visitor.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '15px' }}>
                                                    <div style={{ fontWeight: '600' }}>{visitor.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{visitor.contact}</div>
                                                </td>
                                                <td style={{ padding: '15px', fontSize: '0.9rem' }}>{visitor.purpose}</td>
                                                <td style={{ padding: '15px' }}>{visitor.visitDate}</td>
                                                <td style={{ padding: '15px' }}>
                                                    <span style={{ 
                                                        background: visitor.status === 'admitted' ? 'rgba(16, 185, 129, 0.1)' : (visitor.status === 'completed' ? 'var(--card-inner)' : 'rgba(245, 158, 11, 0.1)'),
                                                        color: visitor.status === 'admitted' ? 'var(--success)' : (visitor.status === 'completed' ? 'var(--text-dim)' : 'var(--warning)'),
                                                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold'
                                                    }}>
                                                        {visitor.status.toUpperCase()}
                                                    </span>
                                                    {visitor.entryTime && (
                                                        <div style={{ fontSize: '0.7rem', marginTop: '5px' }}>In: {visitor.entryTime}</div>
                                                    )}
                                                </td>
                                                {isAdmin && (
                                                    <td style={{ padding: '15px' }}>
                                                        <div style={{ display: 'flex', gap: '5px' }}>
                                                            {visitor.status === 'pending' && (
                                                                <button onClick={() => updateStatus(visitor.id, 'admitted')} className="btn-primary" style={{ padding: '5px 10px', fontSize: '0.75rem' }}>Admit</button>
                                                            )}
                                                            {visitor.status === 'admitted' && (
                                                                <button onClick={() => updateStatus(visitor.id, 'completed')} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.75rem' }}>Exit</button>
                                                            )}
                                                            <button onClick={() => updateStatus(visitor.id, 'rejected')} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.75rem', color: 'var(--error)' }}>X</button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                        {visitors.length === 0 && (
                                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>No visitors logged.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Visitors;
