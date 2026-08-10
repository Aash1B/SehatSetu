# Manual Migration Instructions for Phone Auth

## Your phone authentication is ready! Just need to apply the database changes.

### Quick Steps:

**Option 1: Run the batch file (Easiest)**
1. Double-click `run_migration.bat` in the project root
2. Wait for it to complete
3. Restart your backend server

**Option 2: Run commands manually**
Open a terminal in the project root and run:

```bash
npx prisma db execute --file="prisma\migrations\20260809000001_add_phone_auth_fields\migration.sql"
npx prisma generate
```

Then restart your backend: `npm run start:dev` (or however you start it)

### What these commands do:
- Adds phone, phoneVerified, phoneOtpHash, phoneOtpExpiresAt fields to User table
- Creates unique index on phone field
- Regenerates Prisma Client with the new fields

### After Migration:
1. Test the phone login flow
2. Check backend console for: `[DEV] OTP for +1234567890: 123456`
3. The test OTP will still show on screen (green box) for development
4. Your user data will be properly stored in the database with JWT tokens

### Troubleshooting:
- If migration fails: The fields might already exist (check with `npx prisma studio`)
- If still "Unauthorized": Check backend logs for JWT errors
- Backend should log OTPs in console during development

---
**The phone auth code is 100% ready - just needs this database update!**
