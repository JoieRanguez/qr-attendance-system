'use client';

import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function AttendanceScanner() {
  const [step, setStep] = useState('form');
  const [formData, setFormData] = useState({
    name: '',
    idNumber: '',
    course: ''
  });
  const [status, setStatus] = useState({ message: '', type: '' });
  const [scanner, setScanner] = useState(null);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.idNumber || !formData.course) {
      setStatus({ message: 'Please fill in all fields', type: 'error' });
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
      "qr-reader",
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

    setStatus({ message: 'QR Code scanned! Recording attendance...', type: 'info' });

    try {
      await addDoc(collection(db, 'attendance'), {
        name: formData.name,
        idNumber: formData.idNumber,
        course: formData.course,
        eventId: decodedText,
        timeIn: serverTimestamp(),
        timeOut: null,
        status: 'TIME-IN',
        lastModified: serverTimestamp(),
        synced: false
      });

      setStatus({ 
        message: '✓ Check-in successful! Attendance recorded.', 
        type: 'success' 
      });

      setTimeout(() => {
        setFormData({ name: '', idNumber: '', course: '' });
        setStep('form');
        setStatus({ message: '', type: '' });
      }, 3000);

    } catch (error) {
      console.error('Error recording attendance:', error);
      setStatus({ 
        message: 'Error recording attendance. Please try again.', 
        type: 'error' 
      });
    }
  };

  const onScanError = (errorMessage) => {
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
        <h1>📋 Event Attendance System</h1>
        <p>Scan QR code to check in</p>
      </header>

      <div className="container">
        {status.message && (
          <div className={`status-message status-${status.type}`}>
            {status.message}
          </div>
        )}

        {step === 'form' && (
          <div className="card">
            <h2>Student Information</h2>
            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Juan Dela Cruz"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="idNumber">ID Number</label>
                <input
                  type="text"
                  id="idNumber"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleInputChange}
                  placeholder="24123456"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="course">Course</label>
                <input
                  type="text"
                  id="course"
                  name="course"
                  value={formData.course}
                  onChange={handleInputChange}
                  placeholder="BS Computer Science"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Continue to Scan QR Code
              </button>
            </form>
          </div>
        )}
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <a
            href="/timeout" 
            style={{ 
              color: '#1a73e8', 
              textDecoration: 'none',
              fontSize: '0.875rem'
            }}
          >
            Already checked in? Click here to check out →
          </a>
        </div>

        {step === 'scan' && (
          <div className="card">
            <h2>Scan Event QR Code</h2>
            <p>Point your camera at the QR code displayed at the event</p>
            
            <div id="qr-reader" className="scanner-container"></div>

            <button 
              onClick={handleBack} 
              className="btn btn-secondary"
              style={{ marginTop: '1rem' }}
            >
              ← Back to Form
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
