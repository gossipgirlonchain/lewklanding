import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_7VYXfdNwLJ8B@ep-divine-frog-a4k7nfyw-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(DATABASE_URL);

async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    // Create the signups table
    await sql`
      CREATE TABLE IF NOT EXISTS signups (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_signups_email ON signups(email)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_signups_created_at ON signups(created_at)
    `;
    
    console.log('✅ Database setup complete!');
    console.log('✅ Signups table created');
    console.log('✅ Indexes created');
    
    // Test the connection
    const result = await sql`SELECT COUNT(*) as count FROM signups`;
    console.log(`✅ Current signups: ${result[0].count}`);
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
  }
}

setupDatabase();
