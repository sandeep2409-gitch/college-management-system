import React, { useState, useEffect } from 'react';
import { Send, Clock, CheckCircle, XCircle, Loader2, MapPin, FileText, Calendar, Plus, RefreshCw, UserCheck } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const OutPass = () => {
    const { token, user } = useAuth();
    const isAdmin = user?.role === 'admin';
    
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        reason: '',
        destination: '',
        departureDate: new Date().toISOString().split('T')[0],
        returnDate: ''
    });

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/outpass`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(response.data);
        } catch (err) {
            console.error("Failed to fetch requests", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchRequests();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/outpass`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess('Out-pass request submitted successfully!');
            setFormData({
                reason: '',
                destination: '',
                departureDate: new Date().toISOString().split('T')[0],
                returnDate: ''
            });
            setShowForm(false);
            fetchRequests();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit request.');
        } finally {
            setSubmitting(false);
        }
    };

    const approveRequest = async (id) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/outpass/${id}/approve`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRequests();
        } catch (err) {
            alert('Failed to approve');
        }
    };

    const rejectRequest = async (id) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/outpass/${id}/reject`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRequests();
        } catch (err) {
            alert('Failed to reject');
        }
    };

    return (
        <div className="outpass-page animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Digital Out Pass</h1>
                    <p style={{ color: 'var(--text-dim)' }}>Request and manage off-campus permissions securely</p>
                </div>
                
                {!isAdmin && (
                    <button 
                        onClick={() => setShowForm(!showForm)} 
                        className="btn-primary" 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 25px' }}
                    >
                        {showForm ? <XCircle size={18} /> : <Plus size={18} />}
                        {showForm ? 'Cancel' : 'New Request'}
                    </button>
                )}
            </div>

            {showForm && !isAdmin && (
                <div className="glass-card animate-slide-up" style={{ padding: '30px', marginBottom: '40px', maxWidth: '600px' }}>
                    <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Send color="var(--primary)" size={18} /> Exit Authorization form
                    </h3>
                    
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Destination</label>
                                <div style={{ position: 'relative' }}>
                                    <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-dim)' }} />
                                    <input 
                                        type="text" 
                                        className="input-field" 
                                        style={{ paddingLeft: '40px' }}
                                        required 
                                        value={formData.destination}
                                        onChange={(e) => setFormData({...formData, destination: e.target.value})}
                                        placeholder="City, Home, or Visit place"
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Departure Date</label>
                                <input 
                                    type="date" 
                                    className="input-field" 
                                    required 
                                    value={formData.departureDate}
                                    onChange={(e) => setFormData({...formData, departureDate: e.target.value})}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Return Date (Optional)</label>
                            <input 
                                type="date" 
                                className="input-field" 
                                value={formData.returnDate}
                                onChange={(e) => setFormData({...formData, returnDate: e.target.value})}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Reason for Leave</label>
                            <div style={{ position: 'relative' }}>
                                <FileText size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-dim)' }} />
                                <textarea 
                                    className="input-field" 
                                    required 
                                    rows="3"
                                    style={{ paddingLeft: '40px', borderRadius: '12px', padding: '12px 12px 12px 40px' }}
                                    value={formData.reason}
                                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                                    placeholder="Explain your travel requirement"
                                ></textarea>
                            </div>
                        </div>

                        {error && <p style={{ color: 'var(--error)', fontSize: '0.85rem' }}>{error}</p>}

                        <button className="btn-primary" type="submit" disabled={submitting}>
                            {submitting ? <Loader2 className="animate-spin" /> : 'Submit Request'}
                        </button>
                    </form>
                </div>
            )}

            <div className="glass-card" style={{ padding: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <RefreshCw color="var(--primary)" size={18} /> Pass History & Status
                    </h3>
                    {loading && <Loader2 className="animate-spin" size={18} />}
                </div>

                {loading && requests.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" /></div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', background: 'var(--card-inner)' }}>
                                    <th style={{ padding: '15px' }}>Student</th>
                                    <th style={{ padding: '15px' }}>Destination</th>
                                    <th style={{ padding: '15px' }}>Dates</th>
                                    <th style={{ padding: '15px' }}>Status</th>
                                    {isAdmin && <th style={{ padding: '15px' }}>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(request => (
                                    <tr key={request.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '15px' }}>
                                            <div style={{ fontWeight: '600' }}>{request.studentName}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Reason: {request.reason}</div>
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <MapPin size={14} /> {request.destination}
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            <div style={{ fontSize: '0.9rem' }}>
                                                {request.departureDate}
                                                {request.returnDate && ` → ${request.returnDate}`}
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            <span style={{ 
                                                background: request.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : (request.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'),
                                                color: request.status === 'approved' ? 'var(--success)' : (request.status === 'rejected' ? 'var(--error)' : 'var(--warning)'),
                                                padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold'
                                            }}>
                                                {request.status.toUpperCase()}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td style={{ padding: '15px' }}>
                                                {request.status === 'pending' && (
                                                    <div style={{ display: 'flex', gap: '5px' }}>
                                                        <button onClick={() => approveRequest(request.id)} className="btn-primary" style={{ padding: '5px 12px', fontSize: '0.75rem', background: 'var(--success)', border: 'none' }}>Approve</button>
                                                        <button onClick={() => rejectRequest(request.id)} className="btn-primary" style={{ padding: '5px 12px', fontSize: '0.75rem', background: 'var(--error)', border: 'none' }}>Reject</button>
                                                    </div>
                                                )}
                                                {request.status !== 'pending' && <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Processed</span>}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {requests.length === 0 && (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>No out-pass requests found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OutPass;
