'use client';

import { useState } from 'react';
import '../../app/attendance.css';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // QR Code Generator State
  const [eventId, setEventId] = useState('');
  const [eventName, setEventName] = useState('');
  const [qrCode, setQrCode] = useState(null);
  const [generating, setGenerating] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');

    try {
      const response = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (data.success) {
        setIsAuthenticated(true);
        setPassword('');
      } else {
        setAuthError('Incorrect password. Please try again.');
      }
    } catch (error) {
      setAuthError('Error connecting to server');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    setMessage({ text: '', type: '' });
  };

  const handleSync = async (fullSync = false) => {
    setSyncing(true);
    setMessage({ 
      text: fullSync ? 'Performing full sync...' : 'Syncing new records...', 
      type: 'info' 
    });

    try {
      const response = await fetch('/api/sync-to-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullSync })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ 
          text: `✓ ${data.message}`, 
          type: 'success' 
        });
      } else {
        setMessage({ 
          text: `Error: ${data.message || 'Failed to sync'}`, 
          type: 'error' 
        });
      }
    } catch (error) {
      setMessage({ 
        text: 'Error connecting to server', 
        type: 'error' 
      });
    }

    setSyncing(false);
  };

  const handleGenerateQR = async (e) => {
    e.preventDefault();
    
    if (!eventId.trim()) {
      setMessage({ text: 'Please enter an Event ID', type: 'error' });
      return;
    }

    setGenerating(true);
    setMessage({ text: 'Generating QR Code...', type: 'info' });

    try {
      const response = await fetch('/api/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventId: eventId.trim(),
          eventName: eventName.trim() || eventId.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        setQrCode(data);
        setMessage({ 
          text: '✓ QR Code generated successfully!', 
          type: 'success' 
        });
      } else {
        setMessage({ 
          text: `Error: ${data.error}`, 
          type: 'error' 
        });
      }
    } catch (error) {
      setMessage({ 
        text: 'Error generating QR code', 
        type: 'error' 
      });
    }

    setGenerating(false);
  };

  const handleDownloadQR = () => {
    if (!qrCode) return;

    const link = document.createElement('a');
    link.href = qrCode.qrCode;
    link.download = `${eventId || 'event'}-qr-code.png`;
    link.click();
  };

  const handlePrintQR = () => {
    if (!qrCode) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Code - ${qrCode.eventName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
              background: white;
            }
            .container {
              text-align: center;
              padding: 2rem;
            }
            h1 {
              font-size: 2rem;
              margin-bottom: 0.5rem;
              color: #202124;
            }
            p {
              color: #5f6368;
              margin-bottom: 2rem;
            }
            img {
              max-width: 400px;
              border: 2px solid #dadce0;
              border-radius: 8px;
              padding: 1rem;
              background: white;
            }
            .footer {
              margin-top: 2rem;
              font-size: 0.875rem;
              color: #80868b;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${qrCode.eventName}</h1>
            <p>Event ID: ${qrCode.eventId}</p>
            <img src="${qrCode.qrCode}" alt="Event QR Code" />
            <div class="footer">
              Scan this QR code to check in to the event
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div>
        <header className="header">
          <h1>
            <span className="logo">
              <span className="logo-blue">A</span>
              <span className="logo-red">d</span>
              <span className="logo-yellow">m</span>
              <span className="logo-blue">i</span>
              <span className="logo-green">n</span>
            </span>
            {' '}Login
          </h1>
          <p>Enter password to access admin dashboard</p>
        </header>

        <div className="container">
          <div className="card" style={{ maxWidth: '400px', margin: '2rem auto' }}>
            <h2>Authentication Required</h2>
            <p style={{ marginBottom: '1.5rem', color: '#b0b0b0' }}>
              Please enter the admin password to continue
            </p>

            {authError && (
              <div className="status-message status-error" style={{ marginBottom: '1rem' }}>
                {authError}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  autoFocus
                />
              </div>

              <button type="submit" className="btn btn-primary">
                🔓 Login
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <a 
                href="/" 
                style={{ 
                  color: '#8ab4f8', 
                  textDecoration: 'none',
                  fontSize: '0.875rem'
                }}
              >
                ← Back to Check-in
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard (only shown after login)
  return (
    <div>
      <header className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div>
            <h1>
              <span className="logo">
                <span className="logo-blue">A</span>
                <span className="logo-red">d</span>
                <span className="logo-yellow">m</span>
                <span className="logo-blue">i</span>
                <span className="logo-green">n</span>
              </span>
              {' '}Dashboard
            </h1>
            <p>Generate QR codes and export attendance records</p>
          </div>
          <button 
            onClick={handleLogout}
            style={{
              background: '#2a2a2a',
              border: '1px solid #505050',
              color: '#e8e8e8',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#3a3a3a';
              e.target.style.borderColor = '#707070';
            }}
            onMouseOut={(e) => {
              e.target.style.background = '#2a2a2a';
              e.target.style.borderColor = '#505050';
            }}
          >
            🔒 Logout
          </button>
        </div>
      </header>

      <div className="container">
        {message.text && (
          <div className={`status-message status-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* QR Code Generator */}
        <div className="card">
          <h2>Generate Event QR Code</h2>
          <p>
            Create a unique QR code for your event. Students will scan this code to check in.
          </p>

          <form onSubmit={handleGenerateQR}>
            <div className="form-group">
              <label htmlFor="eventId">Event ID *</label>
              <input
                type="text"
                id="eventId"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                placeholder="e.g., EVT-2025-001"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="eventName">Event Name (Optional)</label>
              <input
                type="text"
                id="eventName"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g., Tech Conference 2025"
              />
            </div>

            <button 
              type="submit"
              disabled={generating}
              className="btn btn-primary"
            >
              {generating ? 'Generating...' : 'Generate QR Code'}
            </button>
          </form>

          {/* Display Generated QR Code */}
          {qrCode && (
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <div style={{ 
                background: '#1a1a1a', 
                padding: '2rem', 
                borderRadius: '8px',
                border: '2px solid #505050'
              }}>
                <h3 style={{ marginBottom: '1rem', color: '#ffffff' }}>
                  {qrCode.eventName}
                </h3>
                <img 
                  src={qrCode.qrCode} 
                  alt="Event QR Code"
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto',
                    border: '1px solid #505050',
                    borderRadius: '4px',
                    background: 'white',
                    padding: '1rem'
                  }}
                />
                <p style={{ 
                  marginTop: '1rem', 
                  color: '#b0b0b0',
                  fontSize: '0.875rem'
                }}>
                  Event ID: <strong style={{ color: '#e8e8e8' }}>{qrCode.eventId}</strong>
                </p>
              </div>

              <div style={{ 
                marginTop: '1rem', 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem'
              }}>
                <button 
                  onClick={handleDownloadQR}
                  className="btn btn-success"
                >
                  📥 Download
                </button>
                <button 
                  onClick={handlePrintQR}
                  className="btn btn-secondary"
                >
                  🖨️ Print
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Export to Google Sheets */}
        <div className="card">
          <h2>Export to Google Sheets</h2>
          <p>
            Sync attendance records from Firebase to your Google Sheet.
          </p>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <button 
              onClick={() => handleSync(false)} 
              disabled={syncing}
              className="btn btn-primary"
            >
              {syncing ? 'Syncing...' : '⚡ Quick Sync'}
            </button>
            <button 
              onClick={() => handleSync(true)} 
              disabled={syncing}
              className="btn btn-secondary"
            >
              {syncing ? 'Syncing...' : '🔄 Full Sync'}
            </button>
          </div>

          <div style={{ 
            fontSize: '0.75rem', 
            color: '#b0b0b0',
            lineHeight: '1.4'
          }}>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: '#e8e8e8' }}>⚡ Quick Sync:</strong> Only syncs new/updated records (faster)
            </p>
            <p>
              <strong style={{ color: '#e8e8e8' }}>🔄 Full Sync:</strong> Re-syncs all records (use if data looks wrong)
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="card">
          <h2>Quick Links</h2>
          <a 
            href="/" 
            className="btn btn-secondary"
            style={{ 
              marginBottom: '0.5rem', 
              display: 'block', 
              textAlign: 'center', 
              textDecoration: 'none' 
            }}
          >
            📋 Check-in Page
          </a>
          <a 
            href="/timeout" 
            className="btn btn-secondary"
            style={{ 
              display: 'block', 
              textAlign: 'center', 
              textDecoration: 'none' 
            }}
          >
            📤 Time-out Page
          </a>
        </div>
      </div>
    </div>
  );
}
