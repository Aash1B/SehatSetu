# Google Sign-In Setup

Sehat-Setu supports Google Sign-In through the existing auth flow. Google is
an alternate credential source only; it still reuses the same JWT, role checks,
doctor onboarding, and patient/doctor session storage as email/password login.

## Required environment variables

- `GOOGLE_CLIENT_ID` for the NestJS backend.
- `VITE_GOOGLE_CLIENT_ID` for the Vite frontend.

Add them to `.env` and `frontend/.env` using the same Google OAuth client ID.

## Google Cloud Console steps

1. Create or select a Google Cloud project.
2. Configure OAuth consent if it is not already set up.
3. Create an OAuth client ID for a Web application.
4. Add `http://localhost:5173` to authorized JavaScript origins for local
   development.
5. Copy the client ID into both environment variables.

## Runtime behavior

- Patient login, patient signup, doctor login, and doctor signup all show a
  Google Sign-In button.
- The frontend sends the Google ID token to `POST /auth/google`.
- The backend verifies the ID token with `google-auth-library`, checks the
  audience, and requires `email_verified` to be true.
- Existing accounts are linked by email or Google subject ID.
- Google-created doctor accounts still respect the doctor onboarding flow.

## Notes

- The client secret is not used by this implementation and should never be
  exposed to the frontend.
- If `VITE_GOOGLE_CLIENT_ID` is missing, the UI shows an unavailable message
  instead of crashing.