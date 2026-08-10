// Direct Node.js script to apply migration
const { Client } = require('pg');
require('dotenv').config();

const migrationSQL = `
-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneOtpHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneOtpExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
`;

async function runMigration() {
  console.log('🔄 Connecting to database...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    console.log('🔄 Running migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration completed successfully!');
    
    console.log('\n📋 Next steps:');
    console.log('1. Run: npx prisma generate');
    console.log('2. Restart your backend server');
    console.log('3. Clear browser local storage');
    console.log('4. Test phone login!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
