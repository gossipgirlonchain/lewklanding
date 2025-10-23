const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
      }

      // Insert the email into the database
      const result = await sql`
        INSERT INTO signups (email)
        VALUES (${email.toLowerCase().trim()})
        RETURNING id, email, created_at
      `;

      return res.status(200).json({
        success: true,
        signup: result[0]
      });

    } catch (error) {
      console.error('Signup error:', error);

      // Check if it's a unique constraint violation (duplicate email)
      if (error.code === '23505') {
        return res.status(409).json({
          error: 'This email is already signed up!'
        });
      }

      return res.status(500).json({
        error: 'Something went wrong. Please try again.'
      });
    }
  }

  if (req.method === 'GET') {
    try {
      const signups = await sql`
        SELECT COUNT(*) as count FROM signups
      `;

      return res.status(200).json({
        count: parseInt(signups[0].count)
      });

    } catch (error) {
      console.error('Get signups error:', error);
      return res.status(500).json({
        error: 'Unable to get signup count'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
