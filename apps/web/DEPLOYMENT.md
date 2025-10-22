# Deploy to lewk.fun

## Option 1: Railway (Recommended)

### Quick Deploy:
1. **Install Railway CLI**: `npm i -g @railway/cli`
2. **Login**: `railway login`
3. **Deploy**: `railway up`
4. **Add Domain**: In Railway dashboard, add `lewk.fun` as custom domain

### Manual Steps:
1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Railway will auto-detect the `railway.json` config
4. Add environment variable: `DATABASE_URL` (your Neon connection string)
5. Deploy and add custom domain `lewk.fun`

## Option 2: Render

1. Go to [render.com](https://render.com)
2. Connect your GitHub repository
3. Render will auto-detect the `render.yaml` config
4. Add environment variable: `DATABASE_URL`
5. Deploy and add custom domain `lewk.fun`

## Option 3: Netlify

1. Go to [netlify.com](https://netlify.com)
2. Connect your GitHub repository
3. Netlify will auto-detect the `netlify.toml` config
4. Add environment variable: `DATABASE_URL`
5. Deploy and add custom domain `lewk.fun`

## Option 4: Fly.io

### Quick Deploy:
1. **Install Fly CLI**: `curl -L https://fly.io/install.sh | sh`
2. **Login**: `fly auth login`
3. **Deploy**: `fly deploy`
4. **Add Domain**: `fly certs add lewk.fun`

### Manual Steps:
1. Go to [fly.io](https://fly.io)
2. Connect your GitHub repository
3. Fly will auto-detect the `fly.toml` config
4. Add environment variable: `DATABASE_URL`
5. Deploy and add custom domain `lewk.fun`

## Environment Variables Needed:
- `DATABASE_URL`: Your Neon database connection string

## Domain Setup:
1. Point your domain `lewk.fun` to the deployment platform
2. Add SSL certificate (usually automatic)
3. Test the site at `https://lewk.fun`

## Testing:
- ✅ Email signup functionality
- ✅ Database connection
- ✅ Logo and fonts loading
- ✅ Responsive design
