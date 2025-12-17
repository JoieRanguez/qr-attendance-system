import { google } from 'googleapis';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
  let serviceAccount;
  
  // Check if we're using environment variable (production) or file (local)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8')
    );
  } else {
    try {
      serviceAccount = require('../../../../firebaseServiceAccountKey.json');
    } catch (error) {
      throw new Error('Firebase credentials not found. Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
    }
  }
  
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

export async function POST(request) {
  try {
    const { fullSync } = await request.json().catch(() => ({}));
    
    // Get records that haven't been synced yet
    const attendanceRef = db.collection('attendance');
    let query = attendanceRef.orderBy('timeIn', 'desc');
    
    // If not a full sync, only get unsynced records
    if (!fullSync) {
      query = query.where('synced', '==', false);
    }
    
    const snapshot = await query.get();

    if (snapshot.empty) {
      return Response.json({ 
        success: true, 
        message: 'No new records to sync. All data is up to date!',
        recordCount: 0,
        eventsCount: 0
      });
    }

    // Group records by Event ID
    const eventGroups = {};
    const recordIds = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const eventId = data.eventId || 'Unknown Event';
      
      if (!eventGroups[eventId]) {
        eventGroups[eventId] = [];
      }
      
      eventGroups[eventId].push({
        id: doc.id,
        data: [
          data.timeIn?.toDate().toLocaleString('en-US', { timeZone: 'Asia/Manila' }) || 'N/A',
          data.eventId || 'N/A',
          data.name || 'N/A',
          data.idNumber || 'N/A',
          data.course || 'N/A',
          data.status || 'TIME-IN',
          data.timeOut?.toDate().toLocaleString('en-US', { timeZone: 'Asia/Manila' }) || 'Pending'
        ]
      });
      
      recordIds.push(doc.id);
    });

    // Set up Google Sheets API
    let googleServiceAccount;
    
    // Check if we're using environment variable (production) or file (local)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      googleServiceAccount = JSON.parse(
        Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8')
      );
    } else {
      try {
        googleServiceAccount = require('../../../../serviceAccountKey.json');
      } catch (error) {
        throw new Error('Google credentials not found. Please set GOOGLE_SERVICE_ACCOUNT_KEY environment variable.');
      }
    }
    
    const auth = new google.auth.GoogleAuth({
      credentials: googleServiceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Get existing sheets
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId
    });

    const existingSheets = spreadsheet.data.sheets.map(sheet => sheet.properties.title);
    let totalRecords = 0;
    let sheetsUpdated = 0;

    // Process each event
    for (const [eventId, records] of Object.entries(eventGroups)) {
      let sheetName = eventId.replace(/[:\\/?*\[\]]/g, '-').substring(0, 100);
      
      // Check if sheet exists, if not create it
      if (!existingSheets.includes(sheetName)) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName
                }
              }
            }]
          }
        });

        // Add headers to new sheet
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1:G1`,
          valueInputOption: 'RAW',
          resource: {
            values: [[
              'Timestamp',
              'Event ID',
              'Name',
              'ID Number',
              'Course',
              'Status',
              'Time Out'
            ]]
          }
        });

        // Format headers
        const newSheetId = (await sheets.spreadsheets.get({
          spreadsheetId
        })).data.sheets.find(s => s.properties.title === sheetName).properties.sheetId;

        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [{
              repeatCell: {
                range: {
                  sheetId: newSheetId,
                  startRowIndex: 0,
                  endRowIndex: 1
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true },
                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
                  }
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor)'
              }
            }]
          }
        });
      }

      if (fullSync) {
        // Full sync: Clear and rewrite everything
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${sheetName}!A2:G`
        });
        
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${sheetName}!A2`,
          valueInputOption: 'RAW',
          resource: {
            values: records.map(r => r.data)
          }
        });
      } else {
        // Incremental sync: Check for existing records and update/append
        const existingData = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A2:G`
        });

        const existingRows = existingData.data.values || [];

        const newRecords = [];
        const updateRequests = [];

        for (const record of records) {
          const idNumber = record.data[3];
          const existingRowIndex = existingRows.findIndex(row => row[3] === idNumber && row[1] === record.data[1]);

          if (existingRowIndex !== -1) {
            // Update existing row
            const rowNumber = existingRowIndex + 2;
            updateRequests.push({
              range: `${sheetName}!A${rowNumber}:G${rowNumber}`,
              values: [record.data]
            });
          } else {
            // New record to append
            newRecords.push(record.data);
          }
        }

        // Update existing records
        if (updateRequests.length > 0) {
          await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            resource: {
              data: updateRequests,
              valueInputOption: 'RAW'
            }
          });
        }

        // Append new records
        if (newRecords.length > 0) {
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${sheetName}!A2`,
            valueInputOption: 'RAW',
            resource: {
              values: newRecords
            }
          });
        }
      }

      totalRecords += records.length;
      sheetsUpdated++;
    }

    // Mark records as synced in Firebase
    const batch = db.batch();
    recordIds.forEach(id => {
      const docRef = db.collection('attendance').doc(id);
      batch.update(docRef, { synced: true });
    });
    await batch.commit();

    return Response.json({ 
      success: true, 
      message: fullSync 
        ? `Full sync complete: ${totalRecords} records across ${sheetsUpdated} event(s)`
        : `Synced ${totalRecords} new/updated records across ${sheetsUpdated} event(s)`,
      recordCount: totalRecords,
      eventsCount: sheetsUpdated,
      syncType: fullSync ? 'full' : 'incremental'
    });

  } catch (error) {
    console.error('Error syncing to Google Sheets:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
