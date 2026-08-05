import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Setup database connection with proper environment variables loaded
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const projectUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '') || 'https://jxsfimnztuoorcpttikz.supabase.co';
const secretKey = process.env.SUPABASE_SECRET_KEY || '';

// Stable working Unsplash URLs to download clean doctor portrait files
const downloadSources: Record<string, string> = {
  'doc-1': 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=800', // Male doctor
  'doc-2': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=800', // Female profile
  'doc-3': 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=800', // Male doctor
  'doc-4': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800', // Male profile
  'doc-5': 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=800', // Male doctor
  'doc-6': 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=800', // Female doctor
  'doc-7': 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=800', // Female profile
  'doc-8': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800', // Male profile
  'doc-9': 'https://images.unsplash.com/photo-1622253694242-abeb37a33e97?auto=format&fit=crop&q=80&w=800', // Female doctor
  'doc-10': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800', // Male profile
  'doc-11': 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=800', // Female doctor
  'doc-12': 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800', // Female doctor
  'doc-13': 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=800', // Doctor with mask
  'doc-14': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800', // Female profile
  'doc-15': 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800', // Male profile
};

async function main() {
  console.log('Starting Doctor Profile Images Upload to Supabase Storage... 🚀');

  if (!secretKey) {
    console.error('SUPABASE_SECRET_KEY is missing from .env! Cannot upload files to storage.');
    process.exit(1);
  }

  // 1. Ensure the bucket 'doctor-profile-images' exists and is public
  console.log('Checking/Creating Supabase Storage bucket "doctor-profile-images"...');
  try {
    const bucketRes = await fetch(`${projectUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'doctor-profile-images',
        name: 'doctor-profile-images',
        public: true,
      }),
    });
    if (bucketRes.ok) {
      console.log('Successfully created/verified public bucket "doctor-profile-images".');
    } else {
      const txt = await bucketRes.text();
      console.log(`Bucket verification status response: ${bucketRes.status} (${txt})`);
    }
  } catch (err) {
    console.error('Error verifying storage bucket:', err);
  }

  // 2. Fetch and upload images to Supabase Storage
  for (const docId of Object.keys(downloadSources)) {
    const sourceUrl = downloadSources[docId];
    const storagePath = `doctors/${docId}/profile.webp`;
    const publicUrl = `${projectUrl}/storage/v1/object/public/doctor-profile-images/${storagePath}`;

    console.log(`Processing [${docId}]...`);
    try {
      // Download the Unsplash image
      const imgRes = await fetch(sourceUrl);
      if (!imgRes.ok) {
        throw new Error(`Failed to download Unsplash image from ${sourceUrl}: status ${imgRes.status}`);
      }
      const buffer = await imgRes.arrayBuffer();

      // Upload to Supabase Storage
      const uploadUrl = `${projectUrl}/storage/v1/object/doctor-profile-images/${storagePath}`;
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'image/webp',
          'x-upsert': 'true',
        },
        body: Buffer.from(buffer),
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Failed to upload to Supabase Storage: status ${uploadRes.status} (${errText})`);
      }

      console.log(`Successfully uploaded [${docId}] to Storage path: ${storagePath}`);

      // Update Prisma database record
      await prisma.doctor.update({
        where: { id: docId },
        data: {
          imageUrl: publicUrl,
          imageStoragePath: storagePath,
        },
      });
      console.log(`Updated database record for [${docId}] with url: ${publicUrl}`);
    } catch (err: any) {
      console.error(`Failed to process [${docId}]:`, err.message);
    }
  }

  console.log('\n--- Doctor Images Verification ---');
  const doctors = await prisma.doctor.findMany({
    where: {
      id: { in: Array.from({ length: 15 }, (_, i) => `doc-${i + 1}`) },
    },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      imageStoragePath: true,
    },
    orderBy: {
      id: 'asc',
    },
  });

  const sortedDoctors = [...doctors].sort((a, b) => {
    const numA = parseInt(a.id.replace('doc-', ''), 10);
    const numB = parseInt(b.id.replace('doc-', ''), 10);
    return numA - numB;
  });

  let allValid = true;
  const duplicateUrls = new Set<string>();
  const seenUrls = new Set<string>();

  for (const doc of sortedDoctors) {
    const paddedId = doc.id.padEnd(6);
    const paddedName = (doc.name || '').padEnd(22);
    const url = doc.imageUrl || '';

    if (seenUrls.has(url)) {
      duplicateUrls.add(url);
    }
    seenUrls.add(url);

    let httpStatus = 0;
    let contentType = 'unknown';
    let valid = 'invalid';

    if (url) {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        httpStatus = res.status;
        contentType = res.headers.get('content-type') || 'unknown';
        if (res.ok && contentType.startsWith('image/')) {
          valid = 'valid';
        } else {
          allValid = false;
        }
      } catch (err) {
        allValid = false;
      }
    } else {
      allValid = false;
    }

    console.log(`${paddedId} | ${url.padEnd(100)} | ${httpStatus} | ${contentType.padEnd(15)} | ${valid}`);
  }

  if (duplicateUrls.size > 0) {
    console.log('\n⚠️ Duplicate URLs detected:');
    duplicateUrls.forEach((url) => console.log(`- ${url}`));
  }

  if (sortedDoctors.length !== 15) {
    console.error(`Error: Found ${sortedDoctors.length} doctors, expected 15.`);
    allValid = false;
  }

  if (!allValid) {
    console.error('\n❌ Doctor image verification failed! Some images are broken or invalid.');
    process.exit(1);
  } else {
    console.log('\n✅ All 15 doctor images are valid and load correctly from Supabase Storage!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
