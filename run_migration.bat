@echo off
cd /d "%~dp0"
echo Running Prisma migration...
npx prisma db execute --file="prisma\migrations\20260809000001_add_phone_auth_fields\migration.sql"
if %ERRORLEVEL% EQU 0 (
    echo Migration successful!
    echo Generating Prisma Client...
    npx prisma generate
) else (
    echo Migration failed with error code %ERRORLEVEL%
)
pause
