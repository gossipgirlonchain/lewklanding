import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    // Insert the email into the database
    const result = await sql`
      INSERT INTO signups (email)
      VALUES (${email.toLowerCase().trim()})
      RETURNING id, email, created_at
    `;

    return Response.json({ 
      success: true, 
      signup: result[0] 
    });

  } catch (error) {
    console.error('Signup error:', error);
    
    // Check if it's a unique constraint violation (duplicate email)
    if (error.code === '23505') {
      return Response.json({ 
        error: 'This email is already signed up!' 
      }, { status: 409 });
    }

    return Response.json({ 
      error: 'Something went wrong. Please try again.' 
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const signups = await sql`
      SELECT COUNT(*) as count FROM signups
    `;

    return Response.json({ 
      count: parseInt(signups[0].count) 
    });

  } catch (error) {
    console.error('Get signups error:', error);
    return Response.json({ 
      error: 'Unable to get signup count' 
    }, { status: 500 });
  }
}