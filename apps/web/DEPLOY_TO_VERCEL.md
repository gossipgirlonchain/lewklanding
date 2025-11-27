# Deploy to Vercel

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI** (optional, for CLI deployment):
   ```bash
   npm i -g vercel
   ```

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Import your Git repository (GitHub, GitLab, or Bitbucket)

2. **Configure Project**
   - **Root Directory**: Set to `apps/web`
   - **Framework Preset**: Next.js (should auto-detect)
   - **Build Command**: `npm run build` (or `bun run build` if using Bun)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (or `bun install`)

3. **Set Environment Variables**
   
   Go to Project Settings → Environment Variables and add:

   ```env
   # Database
   DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
   
   # Privy Authentication
   NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
   PRIVY_APP_SECRET=your-privy-app-secret
   
   # Admin Panel
   ADMIN_SECRET=your-admin-secret-key
   NEXT_PUBLIC_ADMIN_SECRET=your-admin-secret-key
   
   # OpenAI (for LLM market suggestions)
   OPENAI_API_KEY=your-openai-api-key
   OPENAI_MODEL=gpt-4o-mini
   
   # Pusher (for real-time updates)
   PUSHER_APP_ID=your-pusher-app-id
   PUSHER_KEY=your-pusher-key
   PUSHER_SECRET=your-pusher-secret
   PUSHER_CLUSTER=us3
   NEXT_PUBLIC_PUSHER_KEY=your-pusher-key
   NEXT_PUBLIC_PUSHER_CLUSTER=us3
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `your-project.vercel.app`

### Option 2: Deploy via CLI

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Navigate to the web app directory**:
   ```bash
   cd apps/web
   ```

3. **Login to Vercel**:
   ```bash
   vercel login
   ```

4. **Deploy**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project or create new
   - Confirm settings
   - Set environment variables (or add them in dashboard later)

5. **For production deployment**:
   ```bash
   vercel --prod
   ```

## Post-Deployment Checklist

### 1. Verify Environment Variables
- Check all environment variables are set in Vercel dashboard
- Ensure `DATABASE_URL` points to your production database
- Verify Privy credentials are correct

### 2. Run Database Migrations
If you haven't run migrations on production database:

```bash
# Set DATABASE_URL to production URL
export DATABASE_URL="your-production-database-url"

# Run migrations
cd apps/web
npm run db:migrate
```

Or use Prisma Studio to verify tables exist:
```bash
npm run db:studio
```

### 3. Test the Deployment
- Visit your Vercel URL
- Test authentication flow
- Test bet placement
- Check admin panel access

### 4. Set Up Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

## Important Notes

### Build Configuration
- The `vercel.json` in `apps/web` is configured for monorepo structure
- If deploying from root, Vercel should auto-detect Next.js in `apps/web`

### Database Connection
- Ensure your database allows connections from Vercel IPs
- For Neon/Supabase, this is usually enabled by default
- Check database connection pooling settings

### Prisma Client Generation
- Vercel will run `prisma generate` automatically during build
- Ensure `DATABASE_URL` is set before build
- If build fails, check Prisma schema is valid

### Environment Variables
- **Public variables** (NEXT_PUBLIC_*) are exposed to the browser
- **Private variables** are only available server-side
- Never commit `.env` files to Git

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Ensure `package.json` has correct build scripts

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Check database allows external connections
- Verify SSL mode is set correctly (`?sslmode=require`)

### Runtime Errors
- Check function logs in Vercel dashboard
- Verify all environment variables are set
- Check database migrations are applied

## Next Steps

After successful deployment:
1. Set up monitoring (Vercel Analytics)
2. Configure error tracking (Sentry, etc.)
3. Set up CI/CD for automatic deployments
4. Configure custom domain
5. Set up staging environment

