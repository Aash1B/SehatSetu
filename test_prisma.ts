import 'dotenv/config';
import { prisma } from './src/prisma';

async function main() {
  const data = {
    doctorId: 'd1',
    patientName: 'ABC',
    patientAge: '28',
    patientGender: 'Female',
    patientPhone: '+91 98765 43210',
    symptoms: ['Chest Pain', 'Fatigue']
  };

  const doctorId = data.doctorId;
  const dummyUserId = 'dummy-user-' + doctorId;

  console.log("Upserting User...");
  await prisma.user.upsert({
    where: { id: dummyUserId },
    update: {},
    create: {
      id: dummyUserId,
      email: 'priya.sharma@example.com',
      passwordHash: 'dummy',
      fullName: 'Dr. Priya Sharma',
      role: 'DOCTOR'
    }
  });

  console.log("Upserting Doctor...");
  await prisma.doctor.upsert({
    where: { id: doctorId },
    update: {},
    create: {
      id: doctorId,
      userId: dummyUserId,
      specialty: 'General Physician'
    }
  });

  console.log("Creating Appointment...");
  const appointment = await prisma.appointment.create({
    data: {
      ...data,
      doctorId
    }
  });

  console.log("Created successfully:", appointment.id);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
