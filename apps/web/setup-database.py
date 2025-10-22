#!/usr/bin/env python3
import psycopg2
import sys

# Database connection string
DATABASE_URL = "postgresql://neondb_owner:npg_7VYXfdNwLJ8B@ep-divine-frog-a4k7nfyw-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

def setup_database():
    try:
        print("Setting up database...")
        
        # Connect to the database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Create the signups table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS signups (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes
        cur.execute("CREATE INDEX IF NOT EXISTS idx_signups_email ON signups(email)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_signups_created_at ON signups(created_at)")
        
        # Commit the changes
        conn.commit()
        
        print("✅ Database setup complete!")
        print("✅ Signups table created")
        print("✅ Indexes created")
        
        # Test the connection
        cur.execute("SELECT COUNT(*) as count FROM signups")
        result = cur.fetchone()
        print(f"✅ Current signups: {result[0]}")
        
        # Close the connection
        cur.close()
        conn.close()
        
    except Exception as error:
        print(f"❌ Database setup failed: {error}")
        sys.exit(1)

if __name__ == "__main__":
    setup_database()
