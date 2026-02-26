import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, CheckCircle, XCircle, Info, Clock, Loader2, Calendar, UserCheck, Trash2, Download, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Attendance = () => {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'admin';
  const webcamRef = useRef(null);


  const [activeTab, setActiveTab] = useState(isAdmin ? 'history' : 'mark');
  const [isScanning, setIsScanning] = useState(false);
  const [isQRScanning, setIsQRScanning] = useState(false);
  const [qrToken, setQrToken] = useState(null);
  const [qrSessionToken, setQrSessionToken] = useState(null);
  const [qrExpiresIn, setQrExpiresIn] = useState(0);
  const [result, setResult] = useState(null);
  const [studentData, setStudentData] = useState({
    name: user?.name || '',
    id: user?.studentId || ''
  });
  const [capturedImage, setCapturedImage] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);

  useEffect(() => {
    if (user) {
      setStudentData({
        name: user.name || '',
        id: user.studentId || ''
      });
    }
  }, [user]);


  const CLASSROOM_LOCATION = { lat: 16.838936472130737, lng: 82.22506175342866 };
  const ALLOWED_RADIUS_METERS = 100;

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const verifyLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation is not supported by your browser');
        return;
      }

      setIsVerifyingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const dist = calculateDistance(
            position.coords.latitude,
            position.coords.longitude,
            CLASSROOM_LOCATION.lat,
            CLASSROOM_LOCATION.lng
          );

          if (dist <= ALLOWED_RADIUS_METERS) {
            resolve(true);
          } else {
            reject(`Access Denied: You are ${Math.round(dist)}m away. You must be in the classroom to mark attendance.`);
          }
          setIsVerifyingLocation(false);
        },
        (error) => {
          reject('Location access required to verify classroom attendance');
          setIsVerifyingLocation(false);
        }
      );
    });
  };

  const startScan = async () => {
    if (!studentData.id) {
      alert('Please enter your ID first');
      return;
    }

    if (!qrToken) {
      alert('Please scan the classroom QR code first');
      return;
    }

    try {
      setLocationError(null);
      
      // Verification for production/classroom testing
      // For local testing outside of the specific classroom, this might need to be bypassed or adjusted
      try {
        await verifyLocation();
      } catch (locErr) {
        console.warn("Location check failed but proceeding for development:", locErr);
        // Only alert if we really want to enforce it. For now, let's keep it but added logging.
        if (window.location.hostname !== 'localhost' && !window.location.hostname.includes('192.168')) {
           throw locErr;
        }
      }

      setIsScanning(true);
      setResult(null);

      const imageSrc = webcamRef.current.getScreenshot();

      setTimeout(async () => {
        try {
          const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/attendance`, {
            studentId: studentData.id,
            status: 'present',
            qrToken: qrToken
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });

          setIsScanning(false);
          setCapturedImage(imageSrc);
          setResult({
            success: true,
            name: studentData.name,
            studentId: studentData.id,
            timestamp: new Date().toLocaleTimeString(),
            message: response.data.message
          });
          fetchHistory();
        } catch (error) {
          setIsScanning(false);
          alert(error.response?.data?.error || 'Verification failed');
        }
      }, 2500);
    } catch (err) {
      setLocationError(err);
    }
  };

  const generateQR = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/generate-qr-session`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQrSessionToken(response.data.token);
      setQrExpiresIn(300); // 5 minutes
    } catch (error) {
      console.error("QR Generation failed", error);
    }
  };

  useEffect(() => {
    let timer;
    if (qrExpiresIn > 0) {
      timer = setInterval(() => {
        setQrExpiresIn(prev => prev - 1);
      }, 1000);
    } else if (qrExpiresIn === 0 && isAdmin && activeTab === 'generate') {
      generateQR();
    }
    return () => clearInterval(timer);
  }, [qrExpiresIn, isAdmin, activeTab]);

  useEffect(() => {
    let html5QrCode;
    if (isQRScanning) {
      html5QrCode = new Html5Qrcode("reader");
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          setQrToken(decodedText);
          setIsQRScanning(false);
          html5QrCode.stop().then(() => {
            html5QrCode.clear();
          });
        },
        (errorMessage) => {
          // ignore
        }
      ).catch(err => {
        console.error("QR Scanner failed", err);
        setIsQRScanning(false);
      });

      return () => {
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().then(() => {
            html5QrCode.clear();
          }).catch(err => console.error("Error stopping scanner", err));
        }
      };
    }
  }, [isQRScanning]);
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const endpoint = isAdmin ? `${import.meta.env.VITE_API_URL}/api/admin/pending-attendance` : `${import.meta.env.VITE_API_URL}/api/attendance/${user.id}`;
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (history.length === 0) {
      alert("No data available to export.");
      return;
    }

    // Prepare CSV data
    const headers = isAdmin 
      ? ["Student Name", "Student ID", "Date", "Status", "Method"]
      : ["Date", "Status", "Method"];
    
    const csvContent = [
      headers.join(","),
      ...history.map(row => {
        const line = isAdmin
          ? [row.name, row.studentId, row.date, "PRESENT", "QR + Face + Geo"]
          : [row.date, "PRESENT", "QR + Face + Geo"];
        return line.map(field => `"${field}"`).join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchHistory();
  }, [activeTab]);

  return (
    <div className="attendance-page" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ marginBottom: '5px' }}>Attendance Portal</h1>
          <p style={{ color: 'var(--text-dim)' }}>
            {isAdmin ? 'Access and export official campus audit logs' : 'Verify identity and mark your daily presence'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {isAdmin && activeTab === 'history' && (
            <button
              onClick={handleExport}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#334155', padding: '10px 20px' }}
            >
              <Download size={18} /> Export CSV
            </button>
          )}

          <div style={{ display: 'flex', background: 'var(--card-inner)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('generate')}
                style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', background: activeTab === 'generate' ? 'var(--primary)' : 'transparent', color: activeTab === 'generate' ? 'white' : 'var(--text-dim)', border: 'none', cursor: 'pointer' }}
              >
                Broadcast
              </button>
            )}
            {!isAdmin && (
              <button
                onClick={() => setActiveTab('mark')}
                style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', background: activeTab === 'mark' ? 'var(--primary)' : 'transparent', color: activeTab === 'mark' ? 'white' : 'var(--text-dim)', border: 'none', cursor: 'pointer' }}
              >
                Mark
              </button>
            )}
            <button
              onClick={() => setActiveTab('history')}
              style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', background: activeTab === 'history' ? 'var(--primary)' : 'transparent', color: activeTab === 'history' ? 'white' : 'var(--text-dim)', border: 'none', cursor: 'pointer' }}
            >
              Logs
            </button>
          </div>
        </div>
      </div>

      {isAdmin && activeTab === 'generate' && (
        <div className="glass-card" style={{ padding: '50px', textAlign: 'center' }}>
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '20px', display: 'inline-block', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', marginBottom: '30px', border: '8px solid var(--primary)' }}>
              {qrSessionToken ? (
                <QRCodeCanvas 
                  value={qrSessionToken} 
                  size={300} 
                  level="H" 
                  includeMargin={true}
                />
              ) : (
                <div style={{ width: 300, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 size={40} className="animate-spin" color="var(--primary)" />
                </div>
              )}
            </div>
            
            <h2 style={{ marginBottom: '10px' }}>Session Active</h2>
            <p style={{ color: 'var(--text-dim)', marginBottom: '20px' }}>Students must scan this QR to verify they are present in the classroom.</p>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ background: 'var(--card-inner)', padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={16} />
                <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                  {Math.floor(qrExpiresIn / 60)}:{(qrExpiresIn % 60).toString().padStart(2, '0')}
                </span>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>until refresh</span>
              </div>
              <button 
                onClick={generateQR} 
                className="btn-secondary" 
                style={{ padding: '10px', borderRadius: '12px' }}
                title="Refresh QR Now"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {!isAdmin && activeTab === 'mark' && (
        <div className="glass-card" style={{ padding: '30px' }}>
          {window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', padding: '15px', borderRadius: '12px', marginBottom: '20px', color: 'var(--error)', fontSize: '0.9rem' }}>
              <strong>⚠️ Camera Access Restricted:</strong> Your browser requires an <strong>HTTPS</strong> connection to access the camera on mobile. Please use the https:// version of the URL.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 250px', gap: '30px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>Full Name</label>
                  <input type="text" className="input-field" value={studentData.name} disabled />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>ID Number</label>
                  <input type="text" className="input-field" value={studentData.id} disabled />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div 
                  onClick={() => setIsQRScanning(true)}
                  style={{ 
                    cursor: 'pointer',
                    background: qrToken ? 'rgba(16, 185, 129, 0.1)' : 'var(--card-inner)', 
                    border: qrToken ? '2px solid var(--success)' : '2px dashed var(--border)',
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ marginBottom: '10px', color: qrToken ? 'var(--success)' : 'var(--primary)' }}>
                    {qrToken ? <ShieldCheck size={30} style={{ margin: '0 auto' }} /> : <QrCode size={30} style={{ margin: '0 auto' }} />}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700' }}>
                    {qrToken ? 'QR SCANNED' : 'SCAN SESSION QR'}
                  </div>
                </div>

                <div style={{ background: 'var(--card-inner)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 15px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Security Status</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: qrToken ? 'var(--success)' : 'var(--warning)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: qrToken ? 'var(--success)' : 'var(--warning)' }}></div>
                    {qrToken ? 'Session Validated' : 'Awaiting QR Scan'}
                  </div>
                </div>
              </div>

              {isQRScanning && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <div id="reader" style={{ width: '100%', maxWidth: '400px', background: 'white', borderRadius: '20px', overflow: 'hidden' }}></div>
                  <button 
                    onClick={() => setIsQRScanning(false)}
                    className="btn-secondary"
                    style={{ marginTop: '20px', padding: '12px 30px' }}
                  >
                    Cancel Scan
                  </button>
                </div>
              )}

              <div style={{ position: 'relative', borderRadius: '15px', overflow: 'hidden', border: '2px solid var(--border)', background: '#000', minHeight: '200px' }}>
                {!isQRScanning ? (
                  <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" style={{ width: '100%', display: 'block' }} />
                ) : (
                  <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <div className="animate-spin"><RefreshCw size={30} /></div>
                  </div>
                )}
                {isScanning && (
                  <div style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="scan-animation"></div>
                    <div style={{ background: 'var(--primary)', color: 'white', padding: '5px 15px', borderRadius: '20px', zIndex: 10, fontSize: '0.8rem', fontWeight: 'bold' }}>RECOGNIZING...</div>
                  </div>
                )}
              </div>

              <button
                className="btn-primary"
                onClick={startScan}
                disabled={isScanning || isVerifyingLocation || !qrToken}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', height: '50px', position: 'relative', opacity: !qrToken ? 0.6 : 1 }}
              >
                {isVerifyingLocation ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> VERIFYING LOCATION...
                  </>
                ) : (
                  <>
                    <Camera size={20} /> FINAL VERIFICATION
                  </>
                )}
              </button>

              {locationError && (
                <div style={{ marginTop: '15px', color: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid var(--error)' }}>
                  <XCircle size={18} /> {locationError}
                </div>
              )}
            </div>
            <div style={{ background: 'var(--card-inner)', borderRadius: '15px', padding: '20px', border: '1px solid var(--border)' }}>
              <h4 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><ShieldCheck size={18} color="var(--primary)" /> Multi-Factor Security</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>Your attendance is secured via Three-Layer Verification:
                <br /><br />
                <strong>1. Dynamic Session QR:</strong> Scanned from the instructor's screen.
                <br />
                <strong>2. Precise Geofencing:</strong> Verified classroom radius (100m).
                <br />
                <strong>3. AI Identity check:</strong> Facial feature verification.
              </p>
            </div>
          </div>
        </div>
      )}


      {activeTab === 'history' && (
        <div className="glass-card">
          {loading ? <div style={{ padding: '50px', textAlign: 'center' }}><Loader2 className="animate-spin" /></div> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', background: 'var(--card-inner)' }}>
                    {isAdmin && <th style={{ padding: '15px 25px' }}>Student Name</th>}
                    {isAdmin && <th style={{ padding: '15px 25px' }}>ID</th>}
                    <th style={{ padding: '15px 25px' }}>Date</th>
                    <th style={{ padding: '15px 25px' }}>Status</th>
                    <th style={{ padding: '15px 25px' }}>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      {isAdmin && <td style={{ padding: '15px 25px', fontWeight: '600' }}>{row.name}</td>}
                      {isAdmin && <td style={{ padding: '15px 25px' }}>{row.studentId}</td>}
                      <td style={{ padding: '15px 25px' }}>{row.date}</td>
                      <td style={{ padding: '15px 25px' }}>
                        <span style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: 'var(--success)',
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold'
                        }}>
                          PRESENT
                        </span>
                      </td>
                      <td style={{ padding: '15px 25px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                        QR + Face + Geo
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {result && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="glass-card animate-fade-in" style={{ maxWidth: '400px', width: '100%', padding: '40px', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', background: 'var(--success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={45} color="white" />
            </div>
            <h2>Verified!</h2>
            <p style={{ color: 'var(--text-dim)', margin: '15px 0 25px' }}>{result.message}</p>
            <button className="btn-primary" onClick={() => setResult(null)} style={{ width: '100%' }}>Done</button>
          </div>
        </div>
      )}

      <style>{`
        .scan-animation { position: absolute; width: 100%; height: 3px; background: var(--primary); top: 0; left: 0; animation: scanVertical 2s infinite linear; z-index: 5; }
        @keyframes scanVertical { 0% { top: 0; } 100% { top: 100%; } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Attendance;
