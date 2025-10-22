# Email Database Setup Guide

## 1. Set up Neon Database

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy your database connection string

## 2. Configure Environment Variables

Create a `.env` file in the web directory with:

```bash
DATABASE_URL="postgresql://username:password@hostname/database?sslmode=require"
```

Replace with your actual Neon connection string.

## 3. Create Database Table

Run the SQL from `database-setup.sql` in your Neon database console:

```sql
CREATE TABLE IF NOT EXISTS signups (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_signups_email ON signups(email);
CREATE INDEX IF NOT EXISTS idx_signups_created_at ON signups(created_at);
```

## 4. Test the Setup

1. Start your development server: `bun run dev`
2. Try signing up with an email
3. Check your Neon database to see the signup record

## 5. View Signups

You can query your signups in Neon:

```sql
SELECT * FROM signups ORDER BY created_at DESC;
SELECT COUNT(*) as total_signups FROM signups;
```

## Features Included

- ✅ Email validation
- ✅ Duplicate email prevention
- ✅ Signup count display
- ✅ Timestamp tracking
- ✅ Error handling
