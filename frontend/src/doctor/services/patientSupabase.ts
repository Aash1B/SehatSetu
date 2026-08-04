import { supabase } from '../../lib/supabaseClient';

export interface DoctorPatientRecord {
  id: string;
  userId?: string;
  fullName: string;
  email: string;
  phone?: string;
  gender?: string;
  age?: string;
  createdAt?: string;
}

export async function fetchDoctorPatients(): Promise<DoctorPatientRecord[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('Patient')
      .select(`
        id,
        userId,
        phone,
        gender,
        age,
        User:userId (
          id,
          fullName,
          email,
          role
        )
      `)
      .order('id', { ascending: false });

    if (error) {
      console.warn('[Supabase] Failed to fetch patients:', error.message);
      return [];
    }

    return (data ?? []).map((row: any) => {
      const user = Array.isArray(row.User) ? row.User[0] : row.User;
      return {
        id: row.id,
        userId: row.userId,
        fullName: user?.fullName || 'Patient',
        email: user?.email || 'unknown@email.com',
        phone: row.phone || '',
        gender: row.gender || 'Not specified',
        age: row.age || '',
      };
    });
  } catch (err) {
    console.warn('[Supabase] Patient query threw:', err);
    return [];
  }
}

export async function createDoctorPatient(input: {
  fullName: string;
  email: string;
  phone?: string;
  gender?: string;
}) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim();

  if (!fullName || !email) {
    throw new Error('Patient name and email are required.');
  }

  const { data: existingUser, error: userLookupError } = await supabase
    .from('User')
    .select('id, fullName, email')
    .eq('email', email)
    .maybeSingle();

  if (userLookupError) {
    throw userLookupError;
  }

  let userId = existingUser?.id;

  if (!userId) {
    const { data: createdUser, error: createUserError } = await supabase
      .from('User')
      .insert([
        {
          email,
          fullName,
          role: 'PATIENT',
          dataConsentGiven: true,
          emailVerified: true,
        },
      ])
      .select('id')
      .single();

    if (createUserError) {
      throw createUserError;
    }

    userId = createdUser?.id;
  }

  if (!userId) {
    throw new Error('Unable to create the patient user record in Supabase.');
  }

  const { data: existingPatient, error: patientLookupError } = await supabase
    .from('Patient')
    .select('id, userId')
    .eq('userId', userId)
    .maybeSingle();

  if (patientLookupError) {
    throw patientLookupError;
  }

  if (existingPatient) {
    return {
      id: existingPatient.id,
      userId,
      fullName,
      email,
      phone: input.phone || '',
      gender: input.gender || 'Not specified',
      created: false,
    };
  }

  const { data: createdPatient, error: createPatientError } = await supabase
    .from('Patient')
    .insert([
      {
        userId,
        phone: input.phone || '',
        gender: input.gender || 'Not specified',
        age: '',
      },
    ])
    .select('id, userId, phone, gender, age')
    .single();

  if (createPatientError) {
    throw createPatientError;
  }

  return {
    id: createdPatient.id,
    userId,
    fullName,
    email,
    phone: createdPatient.phone || input.phone || '',
    gender: createdPatient.gender || input.gender || 'Not specified',
    age: createdPatient.age || '',
    created: true,
  };
}
