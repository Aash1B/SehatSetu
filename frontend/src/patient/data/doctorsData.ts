export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';

export interface PriorityMeta {
  level: PriorityLevel;
  label: string;
  badgeText: string;
  bgClass: string;
  description: string;
}

export const PRIORITY_CONFIG: Record<PriorityLevel, PriorityMeta> = {
  P1: {
    level: 'P1',
    label: 'Primary Care / High Priority',
    badgeText: '⚡ Primary Care Specialist',
    bgClass: 'priority-badge-p1',
    description: 'First point of medical care & general health consultation',
  },
  P2: {
    level: 'P2',
    label: 'Super Specialist',
    badgeText: '🌟 Super Specialist',
    bgClass: 'priority-badge-p2',
    description: 'Senior Consultant & HOD with advanced surgical/clinical expertise',
  },
  P3: {
    level: 'P3',
    label: 'Top Rated Specialist',
    badgeText: '⭐ Top Rated Specialist',
    bgClass: 'priority-badge-p3',
    description: 'Patient choice award with highest satisfaction ratings',
  },
  P4: {
    level: 'P4',
    label: 'Verified Practitioner',
    badgeText: '✔️ Verified Specialist',
    bgClass: 'priority-badge-p4',
    description: 'Verified practitioner with immediate appointment slots',
  },
};

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  rating: number;
  reviewsCount: number;
  hospital: string;
  location: string;
  imageUrl: string;
  fee: string;
  availableToday: boolean;
  priorityLevel: PriorityLevel;
  priorityScore: number;
  degrees?: string;
  tags?: string[];
}

export const SPECIALIZATIONS = [
  'General Physician',
  'Pediatrician (Child Specialist)',
  'Cardiologist',
  'Orthopedic Doctor',
  'Neurologist',
  'Gynecologist & Obstetrician',
  'Dentist',
  'Ophthalmologist (Eye Specialist)',
  'ENT Specialist (Ear, Nose & Throat)',
  'Dermatologist (Skin Specialist)',
  'Psychiatrist / Psychologist',
  'Pulmonologist (Lung Specialist)',
  'Gastroenterologist',
  'Endocrinologist (Diabetes & Hormones)',
  'Urologist',
];

export const doctorsData: Doctor[] = [
  {
    id: 'd1',
    name: 'Dr. Sarah Jenkins',
    specialty: 'Cardiologist',
    experience: '12 Years',
    rating: 4.8,
    reviewsCount: 3100,
    hospital: 'HeartCare Clinic',
    location: 'Mumbai',
    imageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400',
    fee: '₹1000',
    availableToday: true,
    priorityLevel: 'P1',
    priorityScore: 200,
    degrees: 'MBBS, MD (Cardiology)',
    tags: ['Cardiology Expert', 'Heart Specialist'],
  },
  {
    id: 'doc-6',
    name: 'Dr. Sunita Deshmukh',
    specialty: 'General Physician',
    experience: '11+ Years Experience',
    rating: 4.8,
    reviewsCount: 230,
    hospital: 'Apollo Medical Center',
    location: 'Delhi',
    imageUrl: 'https://images.unsplash.com/photo-1594824813566-88855376a911?auto=format&fit=crop&q=80&w=400',
    fee: '₹500',
    availableToday: true,
    priorityLevel: 'P1',
    priorityScore: 200,
    degrees: 'MBBS, MD - General Medicine',
    tags: ['General Physician', 'Primary Care', 'Fever & Cold', 'Instant Consult'],
  },
  {
    id: 'doc-11',
    name: 'Dr. Ananya Sharma',
    specialty: 'Dermatologist',
    experience: '8+ Years Experience',
    rating: 4.7,
    reviewsCount: 180,
    hospital: 'Fortis Hospital',
    location: 'Mumbai',
    imageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400',
    fee: '₹600',
    availableToday: true,
    priorityLevel: 'P1',
    priorityScore: 195,
    degrees: 'MBBS, MD - Dermatology',
    tags: ['Skin & Laser', 'Dermatology Expert'],
  },
  {
    id: 'doc-1',
    name: 'Dr. Alok Verma',
    specialty: 'Pediatrician',
    experience: '10+ Years Experience',
    rating: 4.9,
    reviewsCount: 310,
    hospital: 'Max Super Speciality Hospital',
    location: 'Noida',
    imageUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400',
    fee: '₹500',
    availableToday: true,
    priorityLevel: 'P2',
    priorityScore: 100,
    degrees: 'MBBS, DCH - Pediatrics',
    tags: ['Child Care', 'Pediatrician Specialist'],
  },
  {
    id: 'doc-2',
    name: 'Dr. Priya Mehta',
    specialty: 'Gynecologist',
    experience: '9+ Years Experience',
    rating: 4.8,
    reviewsCount: 210,
    hospital: 'Kokilaben Hospital',
    location: 'Mumbai',
    imageUrl: 'https://images.unsplash.com/photo-1594824813566-88855376a911?auto=format&fit=crop&q=80&w=400',
    fee: '₹600',
    availableToday: false,
    priorityLevel: 'P3',
    priorityScore: 75,
    degrees: 'MBBS, DGO - Gynecology',
    tags: ['Women Health', 'Obstetrics Specialist'],
  },
  {
    id: 'doc-3',
    name: 'Dr. Amit Verma',
    specialty: 'Neurologist',
    experience: '15+ Years Experience',
    rating: 4.9,
    reviewsCount: 450,
    hospital: 'Neuro Care Hospital',
    location: 'Pune',
    imageUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400',
    fee: '₹1200',
    availableToday: false,
    priorityLevel: 'P2',
    priorityScore: 90,
    degrees: 'MBBS, DM - Neurology',
    tags: ['HOD', 'Brain & Nerve Expert'],
  },
  {
    id: 'doc-5',
    name: 'Dr. Rajesh Gupta',
    specialty: 'Orthopedic Doctor',
    experience: '14+ Years Experience',
    rating: 4.9,
    reviewsCount: 510,
    hospital: 'Apex Spine & Joint Institute',
    location: 'Hyderabad',
    imageUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400',
    fee: '₹1000',
    availableToday: true,
    priorityLevel: 'P2',
    priorityScore: 88,
    degrees: 'MBBS, MS - Orthopedics',
    tags: ['Joint Replacement Specialist'],
  },
  {
    id: 'doc-9',
    name: 'Dr. Meera Nambiar',
    specialty: 'Ophthalmologist',
    experience: '13+ Years Experience',
    rating: 4.8,
    reviewsCount: 340,
    hospital: 'Vision Eye Institute',
    location: 'Pune',
    imageUrl: 'https://images.unsplash.com/photo-1594824813566-88855376a911?auto=format&fit=crop&q=80&w=400',
    fee: '₹750',
    availableToday: true,
    priorityLevel: 'P3',
    priorityScore: 78,
    degrees: 'MBBS, MS - Ophthalmology',
    tags: ['Cataract & Lasik'],
  },
];
