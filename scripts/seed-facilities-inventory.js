const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log('Seeding Facilities and Medicine Inventory...');

  const facilitiesData = [
    {
      id: 'fac-phc-rampur',
      name: 'Rampur Primary Health Centre (PHC)',
      type: 'PHC',
      village: 'Rampur Kalan',
      district: 'Rampur',
    },
    {
      id: 'fac-chc-bilaspur',
      name: 'Bilaspur Community Health Centre (CHC)',
      type: 'CHC',
      village: 'Bilaspur Central',
      district: 'Rampur',
    },
    {
      id: 'fac-dh-rampur',
      name: 'District Hospital Rampur',
      type: 'DISTRICT_HOSPITAL',
      village: 'Civil Lines',
      district: 'Rampur',
    },
    {
      id: 'fac-sgm-lucknow',
      name: 'Sanjay Gandhi Memorial Specialty Hospital',
      type: 'SPECIALTY',
      village: 'Hazratganj',
      district: 'Lucknow',
    },
  ];

  for (const fac of facilitiesData) {
    await prisma.facility.upsert({
      where: { id: fac.id },
      update: fac,
      create: fac,
    });
    console.log(`Upserted Facility: ${fac.name}`);
  }

  // Stock inventory per facility
  const inventoryData = [
    // Rampur PHC
    { facilityId: 'fac-phc-rampur', medicineName: 'Paracetamol tablet', status: 'AVAILABLE', quantity: 250 },
    { facilityId: 'fac-phc-rampur', medicineName: 'Amoxicillin capsule', status: 'LOW_STOCK', quantity: 8 },
    { facilityId: 'fac-phc-rampur', medicineName: 'Cetirizine tablet', status: 'AVAILABLE', quantity: 140 },
    { facilityId: 'fac-phc-rampur', medicineName: 'Oral rehydration salts sachet', status: 'AVAILABLE', quantity: 300 },
    { facilityId: 'fac-phc-rampur', medicineName: 'Amlodipine tablet', status: 'OUT_OF_STOCK', quantity: 0 },
    { facilityId: 'fac-phc-rampur', medicineName: 'Metformin tablet', status: 'LOW_STOCK', quantity: 4 },
    { facilityId: 'fac-phc-rampur', medicineName: 'Ferrous ascorbate tablet', status: 'AVAILABLE', quantity: 180 },
    { facilityId: 'fac-phc-rampur', medicineName: 'Pantoprazole tablet', status: 'AVAILABLE', quantity: 65 },

    // Bilaspur CHC
    { facilityId: 'fac-chc-bilaspur', medicineName: 'Paracetamol tablet', status: 'AVAILABLE', quantity: 500 },
    { facilityId: 'fac-chc-bilaspur', medicineName: 'Amoxicillin capsule', status: 'AVAILABLE', quantity: 120 },
    { facilityId: 'fac-chc-bilaspur', medicineName: 'Azithromycin tablet', status: 'LOW_STOCK', quantity: 5 },
    { facilityId: 'fac-chc-bilaspur', medicineName: 'Amlodipine tablet', status: 'AVAILABLE', quantity: 150 },
    { facilityId: 'fac-chc-bilaspur', medicineName: 'Metformin tablet', status: 'AVAILABLE', quantity: 200 },
    { facilityId: 'fac-chc-bilaspur', medicineName: 'Ciprofloxacin tablet', status: 'OUT_OF_STOCK', quantity: 0 },
    { facilityId: 'fac-chc-bilaspur', medicineName: 'Vitamin D3 tablet', status: 'AVAILABLE', quantity: 80 },

    // District Hospital Rampur
    { facilityId: 'fac-dh-rampur', medicineName: 'Paracetamol tablet', status: 'AVAILABLE', quantity: 2000 },
    { facilityId: 'fac-dh-rampur', medicineName: 'Amoxicillin capsule', status: 'AVAILABLE', quantity: 450 },
    { facilityId: 'fac-dh-rampur', medicineName: 'Azithromycin tablet', status: 'AVAILABLE', quantity: 300 },
    { facilityId: 'fac-dh-rampur', medicineName: 'Ciprofloxacin tablet', status: 'AVAILABLE', quantity: 180 },
    { facilityId: 'fac-dh-rampur', medicineName: 'Amlodipine tablet', status: 'AVAILABLE', quantity: 500 },
    { facilityId: 'fac-dh-rampur', medicineName: 'Metformin tablet', status: 'AVAILABLE', quantity: 600 },
    { facilityId: 'fac-dh-rampur', medicineName: 'Atorvastatin tablet', status: 'AVAILABLE', quantity: 120 },
    { facilityId: 'fac-dh-rampur', medicineName: 'Diclofenac tablet', status: 'AVAILABLE', quantity: 350 },

    // Lucknow Specialty
    { facilityId: 'fac-sgm-lucknow', medicineName: 'Paracetamol tablet', status: 'AVAILABLE', quantity: 3500 },
    { facilityId: 'fac-sgm-lucknow', medicineName: 'Amoxicillin and clavulanate tablet', status: 'AVAILABLE', quantity: 400 },
    { facilityId: 'fac-sgm-lucknow', medicineName: 'Amlodipine tablet', status: 'AVAILABLE', quantity: 800 },
    { facilityId: 'fac-sgm-lucknow', medicineName: 'Atorvastatin tablet', status: 'AVAILABLE', quantity: 500 },
    { facilityId: 'fac-sgm-lucknow', medicineName: 'Metformin tablet', status: 'AVAILABLE', quantity: 1200 },
  ];

  for (const item of inventoryData) {
    const existing = await prisma.medicineStock.findFirst({
      where: {
        facilityId: item.facilityId,
        medicineName: item.medicineName,
      },
    });

    if (existing) {
      await prisma.medicineStock.update({
        where: { id: existing.id },
        data: {
          quantity: item.quantity,
          status: item.status,
        },
      });
    } else {
      await prisma.medicineStock.create({
        data: item,
      });
    }
  }

  console.log(`Seeded ${inventoryData.length} medicine stock entries across 4 facilities.`);
}

seed()
  .catch((err) => {
    console.error('Failed to seed facilities and inventory:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
