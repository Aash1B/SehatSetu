// Doctor API service — Fetch, Search, Filter doctors
// Primary: Direct Supabase read (works on ANY device, any network)
// Fallback: Local NestJS backend proxy (/api/doctors)

import { doctorsData, type Doctor } from '../data/doctorsData';

const supabase: any = null;

const API_BASE = '/api/doctors';

export interface RecommendationResult {
  recommendedCategory: string;
  matchedSymptoms: string[];
  reason: string;
  urgency: string;
  recommendedDoctors: Doctor[];
}

/** Maps a raw Supabase/API doctor row → typed Doctor for the UI */
function mapDoctorRow(d: any): Doctor {
  const rawName = d.user?.fullName || d.fullName || d.name || 'Specialist';
  const displayName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;
  return {
    id: d.id,
    name: displayName,
    specialty: d.specialty || 'General Physician',
    experience: d.experience || '5+ Years Experience',
    rating: d.rating || 4.8,
    reviewsCount: d.reviewsCount ?? d.reviews_count ?? 0,
    hospital: d.hospital || d.clinicName || 'SehatSetu Medical Center',
    location: d.location || 'India',
    imageUrl:
      d.imageUrl || d.image_url || d.photoUrl ||
      'https://images.unsplash.com/photo-1594824813566-88855376a911?auto=format&fit=crop&q=80&w=400',
    fee: d.fee || `₹${d.consultationFee || d.consultation_fee || 500}`,
    availableToday: d.availableToday ?? d.available_today ?? true,
    priorityLevel: d.priorityLevel || d.priority_level || 'P1',
    priorityScore: d.priorityScore ?? d.priority_score ?? 100,
    degrees: d.degrees || d.qualification || 'MBBS',
    tags: Array.isArray(d.tags) && d.tags.length > 0 ? d.tags : [d.specialty || 'General'],
  };
}

/**
 * Fetch all registered doctors.
 * 1. Try Supabase directly (JOIN Doctor + User) — works from ANY device
 * 2. Fallback to local NestJS /api/doctors
 * 3. Final fallback to bundled static data
 */
export async function fetchDoctors(): Promise<Doctor[]> {
  // ── PRIMARY: Direct Supabase query ──────────────────────────────────────
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('Doctor')
        .select(`
          id,
          userId,
          specialty,
          consultationFee,
          name,
          experience,
          degrees,
          hospital,
          location,
          imageUrl,
          fee,
          rating,
          reviewsCount,
          availableToday,
          priorityLevel,
          priorityScore,
          tags,
          availability,
          User:userId (
            id,
            fullName,
            email,
            role
          )
        `);

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map((d: any) => {
          // Supabase joins return related row under the relation name
          const userRow = Array.isArray(d.User) ? d.User[0] : d.User;
          return mapDoctorRow({ ...d, user: userRow });
        });
        // Sort: highest priorityScore first (registered real doctors score 150)
        mapped.sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
        console.log(`[Supabase] Fetched ${mapped.length} doctors directly from Supabase ✅`);
        return mapped;
      }

      if (error) {
        console.warn('[Supabase] Direct query error, trying local API:', error.message);
      }
    } catch (sbErr) {
      console.warn('[Supabase] Client threw, trying local API:', sbErr);
    }
  }

  // ── FALLBACK: Local NestJS backend ──────────────────────────────────────
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error('Backend returned non-ok status');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      console.log(`[API] Fetched ${data.length} doctors from local backend ✅`);
      const dynamicDoctors = data.map(mapDoctorRow);
      const dynamicIds = new Set(dynamicDoctors.map((doctor) => doctor.id));
      const dynamicNames = new Set(dynamicDoctors.map((doctor) => doctor.name.replace(/^dr\.?\s*/i, '').trim().toLowerCase()));
      const mergedDoctors = [
        ...doctorsData.filter((doctor) => !dynamicIds.has(doctor.id) && !dynamicNames.has(doctor.name.replace(/^dr\.?\s*/i, '').trim().toLowerCase())),
        ...dynamicDoctors,
      ];
      // Sort: real registered doctors (priorityScore 150) first, then by score descending
      return mergedDoctors.sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
    }
  } catch (apiErr) {
    console.warn('[API] Local backend unavailable, using static data:', apiErr);
  }

  // ── FINAL FALLBACK: bundled static data ─────────────────────────────────
  console.warn('[Static] Using bundled static doctors data');
  return doctorsData;
}

export async function recommendDoctorsApi(issue: string, symptoms: string[]): Promise<RecommendationResult> {
  const SYMPTOM_TO_SPECIALTY_MAP: Record<string, string> = {
    skin: 'Dermatologist (Skin Specialist)',
    rash: 'Dermatologist (Skin Specialist)',
    itching: 'Dermatologist (Skin Specialist)',
    acne: 'Dermatologist (Skin Specialist)',
    eczema: 'Dermatologist (Skin Specialist)',
    heart: 'Cardiologist',
    chest: 'Cardiologist',
    palpitations: 'Cardiologist',
    beating: 'Cardiologist',
    child: 'Pediatrician (Child Specialist)',
    baby: 'Pediatrician (Child Specialist)',
    toddler: 'Pediatrician (Child Specialist)',
    pediatric: 'Pediatrician (Child Specialist)',
    bone: 'Orthopedic Doctor',
    joint: 'Orthopedic Doctor',
    knee: 'Orthopedic Doctor',
    fracture: 'Orthopedic Doctor',
    spine: 'Orthopedic Doctor',
    migraine: 'Neurologist',
    seizure: 'Neurologist',
    numbness: 'Neurologist',
    period: 'Gynecologist & Obstetrician',
    pregnancy: 'Gynecologist & Obstetrician',
    pcos: 'Gynecologist & Obstetrician',
    tooth: 'Dentist',
    teeth: 'Dentist',
    gum: 'Dentist',
    eye: 'Ophthalmologist (Eye Specialist)',
    vision: 'Ophthalmologist (Eye Specialist)',
    ear: 'ENT Specialist (Ear, Nose & Throat)',
    nose: 'ENT Specialist (Ear, Nose & Throat)',
    throat: 'ENT Specialist (Ear, Nose & Throat)',
    sinus: 'ENT Specialist (Ear, Nose & Throat)',
    anxiety: 'Psychiatrist / Psychologist',
    depression: 'Psychiatrist / Psychologist',
    stress: 'Psychiatrist / Psychologist',
    asthma: 'Pulmonologist (Lung Specialist)',
    breathing: 'Pulmonologist (Lung Specialist)',
    lung: 'Pulmonologist (Lung Specialist)',
    stomach: 'Gastroenterologist',
    acidity: 'Gastroenterologist',
    digestion: 'Gastroenterologist',
    reflux: 'Gastroenterologist',
    diabetes: 'Endocrinologist (Diabetes & Hormones)',
    thyroid: 'Endocrinologist (Diabetes & Hormones)',
    urine: 'Urologist',
    kidney: 'Urologist',
  };

  const combined = `${issue} ${symptoms.join(' ')}`.toLowerCase();
  let targetSpec = 'General Physician';
  for (const [kw, specialty] of Object.entries(SYMPTOM_TO_SPECIALTY_MAP)) {
    if (combined.includes(kw)) {
      targetSpec = specialty;
      break;
    }
  }

  // Try Supabase-based recommendation via symptom matching
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('Doctor')
        .select(`
          id, userId, specialty, consultationFee, name, experience, degrees,
          hospital, location, imageUrl, fee, rating, reviewsCount, availableToday,
          priorityLevel, priorityScore, tags,
          User:userId ( id, fullName, email, role )
        `)
        .ilike('specialty', `%${targetSpec.split(' ')[0]}%`)
        .limit(5);

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map((d: any) => {
          const userRow = Array.isArray(d.User) ? d.User[0] : d.User;
          return mapDoctorRow({ ...d, user: userRow });
        });
        return {
          recommendedCategory: targetSpec,
          matchedSymptoms: symptoms,
          reason: `Matched symptoms to ${targetSpec}`,
          urgency: 'Routine',
          recommendedDoctors: mapped,
        };
      }
    } catch (sbErr) {
      console.warn('[Supabase] Recommendation query failed:', sbErr);
    }
  }

  // Fallback: local NestJS recommend endpoint
  try {
    const res = await fetch(`${API_BASE}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue, symptoms }),
    });
    if (!res.ok) throw new Error('Recommend API non-ok');
    const data = await res.json();
    return {
      recommendedCategory: data.recommendedCategory || 'General Physician',
      matchedSymptoms: data.matchedSymptoms || [],
      reason: data.reason || '',
      urgency: data.urgency || 'Routine',
      recommendedDoctors: (data.recommendedDoctors || []).map(mapDoctorRow),
    };
  } catch {
    // Final fallback: client-side static match
    const matchedDocs = doctorsData.filter(d =>
      d.specialty.toLowerCase().includes(targetSpec.toLowerCase().split(' ')[0])
    );
    const generalPhysicians = doctorsData.filter(d => d.specialty.toLowerCase().includes('general physician'));
    return {
      recommendedCategory: targetSpec,
      matchedSymptoms: symptoms,
      reason: `Matched symptom to ${targetSpec}`,
      urgency: 'Routine',
      recommendedDoctors: matchedDocs.length > 0 ? matchedDocs : generalPhysicians,
    };
  }
}
