# Deployment Guide

## 🚀 Production Deployment

### Prerequisites
- Supabase project configured with correct redirect URLs
- Production domain/hosting platform ready

### Environment Configuration

1. **Update `.env` for production**:
   ```env
   NODE_ENV=production
   SITE_URL=https://your-production-domain.com
   ```

2. **Supabase Dashboard Settings**:
   - Site URL: `https://your-production-domain.com`
   - Redirect URLs:
     - `https://your-production-domain.com`
     - `https://your-production-domain.com/reset-password`

### Deployment Steps

#### GitHub Pages
1. Push code to GitHub repository
2. Enable GitHub Pages in repository settings
3. Set source to main branch
4. Update `SITE_URL` to: `https://username.github.io/repository-name`

#### Vercel
1. Connect GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Update `SITE_URL` to your Vercel domain

#### Netlify
1. Connect GitHub repository to Netlify
2. Add environment variables in Netlify dashboard
3. Update `SITE_URL` to your Netlify domain

### Testing Password Reset

1. **Deploy the application**
2. **Test forgot password flow**:
   - Click "Forgot Password" on login page
   - Enter email address
   - Check email for reset link
   - Verify link redirects to production domain
   - Complete password reset process

### Troubleshooting

- **Still redirecting to localhost?**
  - Check Supabase dashboard redirect URLs
  - Ensure `NODE_ENV=production` in environment
  - Verify `SITE_URL` matches your domain

- **Email not received?**
  - Check spam folder
  - Verify email address is correct
  - Check Supabase logs for errors

- **Reset page not loading?**
  - Ensure `/reset-password` route is accessible
  - Check server logs for errors
  - Verify all files are deployed correctly