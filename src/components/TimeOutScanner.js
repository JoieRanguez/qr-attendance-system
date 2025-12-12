'use client';

import { useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function TimeOutScanner() {
  const [step, setStep] = useState('form');
  const [idNumber, setIdNumber] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });
  const [scanner, setScanner] = useState(null);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    if (!idNumber.trim()) {
      setStatus({ message: 'Please enter your ID number', type: 'error' });
      return;
    }

    setStep('scan');
    setStatus({ message: 'Please scan the event QR code', type: 'info' });
    
    setTimeout(() => {
      initScanner();
    }, 100);
  };

  const initScanner = () => {
    const html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader-timeout",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      false
    );

    html5QrcodeScanner.render(onScanSuccess, onScanError);
    setScanner(html5QrcodeScanner);
  };

  const onScanSuccess = async (decodedText, decodedResult) => {
    console.log(`QR Code detected: ${decodedText}`);
    
    if (scanner) {
      scanner.clear();
    }

    setStatus({ message: 'QR Code scanned! Processing time-out...', type: 'info' });

    try {
      // Find the student's TIME-IN record
      const attendanceRef = collection(db, 'attendance');
      const q = query(
        attendanceRef,
        where('idNumber', '==', idNumber.trim()),
        where('eventId', '==', decodedText),
        where('status', '==', 'TIME-IN')
      );
      
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setStatus({ 
          message: 'No check-in record found. Please make sure you checked in first.', 
          type: 'error' 
        });
        setTimeout(() => {
          setStep('form');
          setStatus({ message: '', type: '' });
        }, 3000);
        return;
      }

      // Update the first matching record with time-out
      const recordDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, 'attendance', recordDoc.id), {
        timeOut: serverTimestamp(),
        status: 'TIME-OUT',
        lastModified: serverTimestamp(),
        synced: false
      });

      setStatus({ 
        message: '✓ Time-out successful! You have been checked out.', 
        type: 'success' 
      });

      setTimeout(() => {
        setIdNumber('');
        setStep('form');
        setStatus({ message: '', type: '' });
      }, 3000);

    } catch (error) {
      console.error('Error recording time-out:', error);
      setStatus({ 
        message: 'Error recording time-out. Please try again.', 
        type: 'error' 
      });
    }
  };

  const onScanError = (errorMessage) => {
    // Ignore continuous scan errors
  };

  const handleBack = () => {
    if (scanner) {
      scanner.clear();
    }
    setStep('form');
    setStatus({ message: '', type: '' });
  };

  return (
    <div>
      <header className="header">
        <h1>📤 Event Time-Out</h1>
        <p>Scan QR code to check out</p>
      </header>

      <div className="container">
        {status.message && (
          <div className={`status-message status-${status.type}`}>
            {status.message}
          </div>
        )}

        {step === 'form' && (
          <div className="card">
            <h2>Enter Your ID Number</h2>
            <p style={{ marginBottom: '1.5rem', color: '#5f6368' }}>
              Enter the same ID number you used when checking in
            </p>
            
            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label htmlFor="idNumber">ID Number</label>
                <input
                  type="text"
                  id="idNumber"
                  name="idNumber"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="24123456"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Continue to Scan QR Code
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <a 
                href="/" 
                style={{ 
                  color: '#1a73e8', 
                  textDecoration: 'none',
                  fontSize: '0.875rem'
                }}
              >
                ← Back to Check-in
              </a>
            </div>
          </div>
        )}

        {step === 'scan' && (
          <div className="card">
            <h2>Scan Event QR Code</h2>
            <p style={{ marginBottom: '1.5rem', color: '#5f6368' }}>
              Point your camera at the same QR code you scanned when checking in
            </p>
            
            <div id="qr-reader-timeout" className="scanner-container"></div>

            <button 
              onClick={handleBack} 
              className="btn btn-secondary"
              style={{ marginTop: '1rem' }}
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}