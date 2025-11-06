export default async function handler(req, res) {
  const redirect_uri = encodeURIComponent(
    "https://subsdata.vercel.app/api/auth-google-callback"
  );

  const client_id = process.env.VITE_GOOGLE_CLIENT_ID;
  const scope = encodeURIComponent(
    "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid"
  );

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}&access_type=offline`;

  return res.redirect(authUrl);
}