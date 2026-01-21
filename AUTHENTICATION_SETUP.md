# Authentication Setup Guide

This guide covers OAuth integration setup for Blockbuilders in both sandbox (development) and production environments.

## Supported OAuth Providers

- **Google OAuth 2.0**
- **GitHub OAuth**

Both providers use the Authorization Code Flow with server-side token exchange.

---

## Environment Variables

Add these to your `.env` file:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Frontend URL (used for redirect URIs)
FRONTEND_URL=http://localhost:3000  # or your production URL
```

---

## Google OAuth Setup

### Sandbox / Development

1. **Go to Google Cloud Console**
   - Navigate to [https://console.cloud.google.com/](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable the Google+ API** (if not already enabled)
   - Go to **APIs & Services > Library**
   - Search for "Google+ API" and enable it

3. **Configure OAuth Consent Screen**
   - Go to **APIs & Services > OAuth consent screen**
   - Select **External** user type (for testing)
   - Fill in required fields:
     - App name: `Blockbuilders (Dev)`
     - User support email: your email
     - Developer contact email: your email
   - Add scopes: `email`, `profile`, `openid`
   - Add test users (your email and any testers)
   - Save

4. **Create OAuth Credentials**
   - Go to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth client ID**
   - Application type: **Web application**
   - Name: `Blockbuilders Local`
   - Authorized JavaScript origins:
     ```
     http://localhost:3000
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:3000/auth/callback
     ```
   - Click **Create**
   - Copy the **Client ID** and **Client Secret**

5. **Set Environment Variables**
   ```bash
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   FRONTEND_URL=http://localhost:3000
   ```

### Production

1. **Create Production Credentials**
   - In Google Cloud Console, create a new OAuth client ID
   - Name: `Blockbuilders Production`
   - Authorized JavaScript origins:
     ```
     https://yourdomain.com
     https://www.yourdomain.com
     ```
   - Authorized redirect URIs:
     ```
     https://yourdomain.com/auth/callback
     https://www.yourdomain.com/auth/callback
     ```

2. **Publish OAuth Consent Screen**
   - Go to **OAuth consent screen**
   - Click **Publish App**
   - Submit for verification if requesting sensitive scopes
   - Note: Basic profile scopes (`email`, `profile`) typically don't require verification

3. **Update Production Environment Variables**
   ```bash
   GOOGLE_CLIENT_ID=your_production_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_production_client_secret
   FRONTEND_URL=https://yourdomain.com
   ```

---

## GitHub OAuth Setup

### Sandbox / Development

1. **Go to GitHub Developer Settings**
   - Navigate to [https://github.com/settings/developers](https://github.com/settings/developers)
   - Or: GitHub > Settings > Developer settings > OAuth Apps

2. **Create a New OAuth App**
   - Click **New OAuth App**
   - Fill in the form:
     - Application name: `Blockbuilders Local`
     - Homepage URL: `http://localhost:3000`
     - Application description: (optional)
     - Authorization callback URL:
       ```
       http://localhost:3000/auth/callback
       ```
   - Click **Register application**

3. **Generate Client Secret**
   - On the app page, click **Generate a new client secret**
   - Copy the secret immediately (it won't be shown again)

4. **Set Environment Variables**
   ```bash
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   FRONTEND_URL=http://localhost:3000
   ```

### Production

1. **Create Production OAuth App**
   - In GitHub Developer Settings, create a new OAuth App
   - Application name: `Blockbuilders`
   - Homepage URL: `https://yourdomain.com`
   - Authorization callback URL:
     ```
     https://yourdomain.com/auth/callback
     ```

2. **Generate Client Secret**
   - Generate and securely store the client secret

3. **Update Production Environment Variables**
   ```bash
   GITHUB_CLIENT_ID=your_production_client_id
   GITHUB_CLIENT_SECRET=your_production_client_secret
   FRONTEND_URL=https://yourdomain.com
   ```

---

## Infrastructure Requirements

### Redis
OAuth state tokens are stored in Redis with a 10-minute TTL. Ensure Redis is running:

```bash
# Local development
redis-server

# Verify connection
redis-cli ping  # Should return PONG
```

### Database Migrations
Ensure migration `007_add_auth_fields` has been applied:

```bash
cd backend
alembic upgrade head
```

This migration adds:
- `auth_provider` column (stores "google", "github", or null)
- `provider_user_id` column (provider's unique user ID)
- Unique index on `(auth_provider, provider_user_id)`

---

## Testing the Integration

### 1. Start the Application

```bash
# Terminal 1: Backend
cd backend
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 2. Test OAuth Flow

1. Navigate to `http://localhost:3000`
2. Click **Continue with Google** or **Continue with GitHub**
3. You should be redirected to the provider's consent screen
4. After granting access, you should be redirected back to the dashboard

### 3. Verify in Database

```sql
SELECT email, auth_provider, provider_user_id
FROM users
WHERE auth_provider IS NOT NULL;
```

---

## Callback URL Reference

| Environment | Callback URL |
|-------------|--------------|
| Local Dev | `http://localhost:3000/auth/callback` |
| Staging | `https://staging.yourdomain.com/auth/callback` |
| Production | `https://yourdomain.com/auth/callback` |

The callback URL must match **exactly** in your OAuth provider settings.

---

## Security Considerations

### State Parameter
- A cryptographically secure state token is generated for each OAuth request
- Stored in Redis with 10-minute expiration
- Validated on callback to prevent CSRF attacks

### Token Exchange
- Authorization codes are exchanged server-side
- Client secrets are never exposed to the browser
- All provider communication uses HTTPS

### Account Linking
- OAuth accounts are identified by `(auth_provider, provider_user_id)` tuple
- If an email already exists with a different auth method, OAuth login is rejected
- This prevents account takeover via OAuth

### Recommended Production Settings
- Use HTTPS only (redirect HTTP to HTTPS)
- Set secure cookie flags
- Configure proper CORS origins
- Rotate client secrets periodically

---

## Troubleshooting

### "Invalid state parameter"
- **Cause**: State token expired (>10 minutes) or Redis unavailable
- **Fix**: Ensure Redis is running; try the OAuth flow again

### "redirect_uri_mismatch" (Google)
- **Cause**: Callback URL doesn't match OAuth app settings
- **Fix**: Verify the exact URL in Google Cloud Console matches `FRONTEND_URL/auth/callback`

### "The redirect_uri MUST match the registered callback URL" (GitHub)
- **Cause**: Callback URL mismatch
- **Fix**: Update the Authorization callback URL in GitHub OAuth App settings

### "An account with this email already exists"
- **Cause**: User previously signed up with email/password
- **Fix**: User should sign in with their original method; account linking is not supported

### OAuth buttons not appearing
- **Cause**: Missing client IDs in environment
- **Fix**: Set `GOOGLE_CLIENT_ID` and/or `GITHUB_CLIENT_ID` environment variables

### "Failed to get user info from provider"
- **Cause**: Token exchange failed or provider API error
- **Fix**: Check that client secret is correct; verify OAuth app is active

---

## Quick Setup Checklist

### Development
- [ ] Create Google OAuth credentials with `localhost:3000` redirect
- [ ] Create GitHub OAuth App with `localhost:3000` redirect
- [ ] Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- [ ] Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
- [ ] Set `FRONTEND_URL=http://localhost:3000`
- [ ] Ensure Redis is running
- [ ] Run database migrations

### Production
- [ ] Create production Google OAuth credentials
- [ ] Publish Google OAuth consent screen
- [ ] Create production GitHub OAuth App
- [ ] Set production environment variables
- [ ] Verify callback URLs use HTTPS
- [ ] Test full OAuth flow in production
