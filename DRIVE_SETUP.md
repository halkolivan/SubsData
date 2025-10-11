
# Google Drive backup — setup (local / localhost)

This project now includes a server endpoint that can save subscriptions to Google Drive:
- POST `/save-subs` — saves the JSON to a file `subsdata-backup-<timestamp>.json` in the authenticated Drive (uses `drive.file` scope).
- GET `/auth-url` — returns an auth URL to obtain an OAuth code (one-time).
- POST `/exchange-code` — exchanges a `code` (from the OAuth flow) for tokens (returns `refresh_token`).

## 1) Recommended environment variables (add to your `.env` locally — DO NOT commit)

```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/oauth2callback   # optional, can be 'urn:ietf:wg:oauth:2.0:oob'
GOOGLE_REFRESH_TOKEN=  # fill after exchanging code (see below)
```

## 2) How to obtain a refresh token (one-time)

1. Start the server: `node server.js` (or `npm run start` if configured).
2. Visit the auth URL:
   - GET `http://localhost:4000/auth-url`
   - The response JSON contains an `authUrl`. Open it in your browser.
3. Approve access in Google consent screen. Google will return a `code`.
4. Exchange the code:
   - POST `http://localhost:4000/exchange-code` with JSON body `{ "code": "PASTE_CODE_HERE" }`
   - The response includes `tokens.refresh_token`. Copy it into your `.env` as `GOOGLE_REFRESH_TOKEN`.
5. Restart the server.

## 3) Test saving subscriptions

Example `curl` (replace with real data):

```bash
curl -X POST http://localhost:4000/save-subs \
  -H "Content-Type: application/json" \
  -d '{"subscriptions":[{"name":"Netflix","price":9.99},{"name":"Spotify","price":4.99}]}'
```

On success you'll get a JSON response with `success: true` and Drive file info.

## 4) Notes / alternatives

- The server uses the `drive.file` scope (only files created by this app). If you want access to all Drive files, use `https://www.googleapis.com/auth/drive` — but that requires more review from Google for production apps.
- **Service account alternative**: If you prefer not to use OAuth for a personal Google account, a service account can be used. A service account has its own Drive; to save into a user Drive you need to share a folder with the service account or use domain-wide delegation (G Suite). Ask me and I can add a service-account flow.
- Never commit client secrets or refresh tokens to public GitHub.

