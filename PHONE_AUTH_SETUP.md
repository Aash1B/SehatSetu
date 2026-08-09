# Phone Authentication Setup Instructions

## Step 1: Run Database Migration

Open a terminal in the project root directory and run:

```bash
npx prisma migrate dev --name add_phone_auth_fields
```

This will add the following fields to the User table:
- `phone` (String, unique, optional)
- `phoneVerified` (Boolean)
- `phoneOtpHash` (String, optional)
- `phoneOtpExpiresAt` (DateTime, optional)

## Step 2: Generate Prisma Client

```bash
npx prisma generate
```

## Step 3: Restart Backend Server

Stop the current backend process (Ctrl+C) and restart it:

```bash
npm run start:dev
```

## Step 4: Test Phone Authentication

1. Go to http://localhost:5173/patient/login
2. Click on the "Phone Number" tab
3. Enter a 10-digit phone number
4. Click "Send OTP"
5. Check the backend console logs - you'll see the OTP printed there (for development)
6. Copy the OTP from console
7. Enter your full name
8. Paste the OTP
9. Click "Verify & Login"
10. You should be logged in successfully!

## Backend Endpoints Created:

- `POST /auth/send-phone-otp` - Send OTP to phone number
- `POST /auth/verify-phone-otp` - Verify OTP and login
- `POST /auth/phone-signup` - Create account with phone + OTP

## How It Works:

1. **Send OTP**: Creates/updates user record with hashed OTP
2. **Verify OTP**: Checks if OTP matches, returns JWT token
3. **Signup**: If user doesn't exist, creates new account

## Database Schema Changes:

```prisma
model User {
  // ... existing fields
  phone              String?    @unique  // NEW
  phoneVerified      Boolean    @default(false)  // NEW
  phoneOtpHash       String?    // NEW
  phoneOtpExpiresAt  DateTime?  // NEW
  // ... rest of fields
}
```

## Development Mode:

The OTP is logged to the console for development purposes. Replace this with actual SMS service (Twilio, AWS SNS, etc.) in production.

See `src/auth/auth.service.ts` line with:
```typescript
console.log(`[DEV] OTP for ${phoneNumber}: ${otp}`);
```

## Frontend Test OTP Display:

The green OTP box shown on screen is for convenience during development. It shows the same OTP that's being used in the backend validation.

## Troubleshooting:

**Issue: "Unauthorized" error after login**
- Make sure the database migration ran successfully
- Restart the backend server
- Clear browser localStorage and try again

**Issue: "Cannot POST /auth/send-phone-otp"**  
- Make sure backend server is running
- Check that auth.controller.ts has the new routes
- Restart backend server

**Issue: OTP verification fails**
- Make sure you're using the OTP from the backend console logs
- OTP expires after 10 minutes
- Each OTP can only be used once
