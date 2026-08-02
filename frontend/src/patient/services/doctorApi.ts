// Doctor API service - Fetch, Search, Filter doctors
// TODO: Implement RTK Query endpoints

const API_BASE = '/api/doctors';

export interface RecommendationResult {
  recommendedCategory: string;
  matchedSymptoms: string[];
  reason: string;
  urgency: string;
  recommendedDoctors: Doctor[];
}

export async function fetchDoctors(): Promise<Doctor[]> {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) {
      throw new Error('Failed to fetch doctors from backend');
    }
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        name: d.user?.fullName || d.name || 'Dr. Specialist',
        specialty: d.specialty,
        experience: d.experience || '10+ Years Experience',
        rating: d.rating || 4.8,
        reviewsCount: d.reviewsCount || 200,
        hospital: d.hospital || 'SehatSetu Medical Center',
        location: d.location || 'Delhi',
        imageUrl: d.imageUrl || 'https://images.unsplash.com/photo-1594824813566-88855376a911?auto=format&fit=crop&q=80&w=400',
        fee: d.fee || `₹${d.consultationFee || 500}`,
        availableToday: d.availableToday ?? true,
        priorityLevel: d.priorityLevel || 'P1',
        priorityScore: d.priorityScore || 100,
        degrees: d.degrees || 'MBBS',
        tags: d.tags || [d.specialty],
      }));
    }
    return doctorsData;
  } catch (error) {
    console.warn('Backend fetch failed, falling back to static doctors data:', error);
    return doctorsData;
  }
}

export async function recommendDoctorsApi(issue: string, symptoms: string[]): Promise<RecommendationResult> {
  try {
    const res = await fetch(`${API_BASE}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue, symptoms }),
    });

    if (!res.ok) {
      throw new Error('Failed to fetch recommendation from backend');
    }

    const data = await res.json();
    return {
      recommendedCategory: data.recommendedCategory || 'General Physician',
      matchedSymptoms: data.matchedSymptoms || [],
      reason: data.reason || '',
      urgency: data.urgency || 'Routine',
      recommendedDoctors: (data.recommendedDoctors || []).map((d: any) => ({
        id: d.id,
        name: d.user?.fullName || d.name || 'Dr. Specialist',
        specialty: d.specialty,
        experience: d.experience || '10+ Years Experience',
        rating: d.rating || 4.8,
        reviewsCount: d.reviewsCount || 200,
        hospital: d.hospital || 'SehatSetu Medical Center',
        location: d.location || 'Delhi',
        imageUrl: d.imageUrl || 'https://images.unsplash.com/photo-1594824813566-88855376a911?auto=format&fit=crop&q=80&w=400',
        fee: d.fee || `₹${d.consultationFee || 500}`,
        availableToday: d.availableToday ?? true,
        priorityLevel: d.priorityLevel || 'P1',
        priorityScore: d.priorityScore || 100,
        degrees: d.degrees || 'MBBS',
        tags: d.tags || [d.specialty],
      })),
    };
  } catch (error) {
    console.warn('Recommendation API failed, using fallback:', error);
    const combined = `${issue} ${symptoms.join(' ')}`.toLowerCase();
    let targetSpec = 'General Physician';
    if (combined.includes('skin') || combined.includes('rash') || combined.includes('itch')) targetSpec = 'Dermatologist';
    else if (combined.includes('heart') || combined.includes('chest')) targetSpec = 'Cardiologist';
    else if (combined.includes('child') || combined.includes('baby')) targetSpec = 'Pediatrician';
    else if (combined.includes('bone') || combined.includes('joint')) targetSpec = 'Orthopedic Doctor';

    const matchedDocs = doctorsData.filter(d => d.specialty.toLowerCase().includes(targetSpec.toLowerCase().split(' ')[0]));
    return {
      recommendedCategory: targetSpec,
      matchedSymptoms: symptoms,
      reason: `Matched symptom to ${targetSpec}`,
      urgency: 'Routine',
      recommendedDoctors: matchedDocs.length > 0 ? matchedDocs : doctorsData.slice(0, 3),
    };
  }
}
