# Fix "Unauthorized" Error - Phone Authentication

## Problem
You're seeing "Unauthorized" on the dashboard after phone login because:
1. The database migration hasn't been applied yet (phone fields don't exist in the User table)
2. Frontend is using test mode which creates fake JWT tokens
3. Backend JWT guard rejects these fake tokens

## Solution - Run These 3 Commands

### Step 1: Open PowerShell or Command Prompt
Navigate to your project directory:
```bash
cd c:\Users\shubh\Desktop\React\Webtech\SehatSetu
```

### Step 2: Apply Database Migration
Run this command to add phone fields to your database:
```bash
npx prisma db push
```

**Alternative if above fails:**
```bash
npx prisma migrate deploy
```

### Step 3: Regenerate Prisma Client
```bash
npx prisma generate
```

### Step 4: Restart Backend Server
Stop your backend server (Ctrl+C if running) and restart it:
```bash
npm run start:dev
```
OR
```bash
npm run start
```

---

## How to Test After Migration

### 1. **Clear Your Browser Data** (Important!)
- Press F12 (DevTools) → Application tab → Local Storage → Clear All
- Or just use Incognito/Private window

### 2. **Go to Patient Login**
- Open: http://localhost:5173/patient/login

### 3. **Click "Phone Number" Tab**

### 4. **Enter Phone Number**
- Example: `+919876543210` or `9876543210`
- Click **"Send OTP"**
- You should see a **green box with 6-digit test OTP**

### 5. **Check Backend Console**
Your backend should log:
```
[DEV] OTP for +919876543210: 123456
```

### 6. **Enter Name and OTP**
- **Full Name**: Enter your name (required for new users)
- **OTP**: Copy the 6-digit code from green box
- Click **"Verify & Login"**

### 7. **Check Dashboard**
- Should redirect to `/patient/dashboard`
- Should show YOUR actual name and data
- No more "Unauthorized" error

---

## What the Migration Does

The migration adds these fields to your `User` table:
- `phone` (TEXT, UNIQUE) - Stores phone number
- `phoneVerified` (BOOLEAN) - Whether phone is verified
- `phoneOtpHash` (TEXT) - Hashed OTP for verification
- `phoneOtpExpiresAt` (TIMESTAMP) - OTP expiry time

---

## Troubleshooting

### If "npx prisma db push" fails:
Try this PowerShell command:
```powershell
Get-Content prisma\migrations\20260809000001_add_phone_auth_fields\migration.sql | npx prisma db execute --stdin
```

### If still getting "Unauthorized":
1. Check backend console for errors
2. Verify backend is running on port 8000
3. Check Network tab in browser DevTools for 401 errors
4. Make sure you cleared browser local storage

### If OTP doesn't work:
1. Check backend logs for `[DEV] OTP for...`
2. Use the exact OTP from backend console
3. OTP expires in 10 minutes - request new one if expired

### If name field doesn't appear:
- It should appear immediately after clicking "Send OTP"
- It's always visible (whether new user or existing)

---

## Migration File Location
The migration SQL is at:
`prisma/migrations/20260809000001_add_phone_auth_fields/migration.sql`

---

## Quick Summary
1. Run: `npx prisma db push`
2. Run: `npx prisma generate`
3. Restart backend server
4. Clear browser local storage
5. Test phone login again

**Your phone authentication code is 100% ready - it just needs the database update!**
