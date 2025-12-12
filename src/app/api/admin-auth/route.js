export async function POST(request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return Response.json({ 
        success: false, 
        error: 'Admin password not configured' 
      }, { status: 500 });
    }

    if (password === adminPassword) {
      return Response.json({ 
        success: true, 
        message: 'Authentication successful' 
      });
    } else {
      return Response.json({ 
        success: false, 
        message: 'Incorrect password' 
      }, { status: 401 });
    }

  } catch (error) {
    console.error('Auth error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
