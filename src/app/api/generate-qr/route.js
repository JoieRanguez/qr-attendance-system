import QRCode from 'qrcode';

export async function POST(request) {
  try {
    const { eventId, eventName } = await request.json();

    if (!eventId) {
      return Response.json({ 
        success: false, 
        error: 'Event ID is required' 
      }, { status: 400 });
    }

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(eventId, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return Response.json({ 
      success: true, 
      qrCode: qrCodeDataUrl,
      eventId: eventId,
      eventName: eventName
    });

  } catch (error) {
    console.error('Error generating QR code:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}