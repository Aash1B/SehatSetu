import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getUser } from '../../auth/authStorage';
import { 
  User, 
  Stethoscope, 
  Award, 
  Building2, 
  MapPin, 
  DollarSign, 
  Upload, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  FileText, 
  ShieldCheck, 
  Sparkles,
  Phone,
  Mail,
  Clock,
  Globe,
  Camera,
  Check,
  Briefcase
} from 'lucide-react';
import { getDoctorProfileData, setActiveDoctorId } from '../utils/doctorProfile';
import { getToken } from '../../auth/authStorage';
import { DoctorProfileData } from '../types/profile.types';

const SPECIALIZATIONS = [
  'General Physician',
  'Cardiologist',
  'Dermatologist',
  'Pediatrician',
  'Gynecologist',
  'Neurologist',
  'Orthopedic Doctor',
  'Psychiatrist',
  'Oncologist',
  'ENT Specialist',
  'Ophthalmologist',
  'Endocrinologist',
  'Urologist',
  'Gastroenterologist'
];

const AVAILABLE_LANGUAGES = [
  'English', 'Hindi', 'Marathi', 'Gujarati', 'Bengali', 
  'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Punjabi'
];

const DEFAULT_DOCTOR_AVATAR = 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400';

const DoctorOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    fullName: '',
    photoUrl: '',
    email: '',
    phoneNumber: '',
    gender: 'Female',
    
    specialization: 'General Physician',
    qualification: '',
    yearsOfExperience: '',
    medicalLicenseNumber: '',
    
    clinicName: '',
    address: '',
    consultationFee: '',
    aboutMe: '',
    languagesSpoken: [] as string[],
    
    // Verification Docs & Schedule Defaults
    slotDurationMinutes: 30,
    availableDays: 'Monday - Saturday (09:00 AM - 05:00 PM)'
  });

  useEffect(() => {
    const user = getUser();
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: prev.fullName || user.fullName || '',
        email: prev.email || user.email || '',
      }));
    }
  }, []);

  const handleTextChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear errors when user starts filling
    if (stepErrors.length > 0) setStepErrors([]);
  };

  // Returns array of error messages for the given step
  const validateStep = (step: number): string[] => {
    const errors: string[] = [];
    if (step === 1) {
      if (!formData.fullName.trim()) errors.push('Full name is required.');
      if (!formData.email.trim()) errors.push('Email address is required.');
      if (!formData.phoneNumber.trim()) errors.push('Phone number is required.');
      if (formData.languagesSpoken.length === 0) errors.push('Select at least one language spoken.');
    } else if (step === 2) {
      if (!formData.specialization.trim()) errors.push('Specialization is required.');
      if (!formData.qualification.trim()) errors.push('Qualification / degrees are required.');
      if (!formData.yearsOfExperience.toString().trim() || Number(formData.yearsOfExperience) < 0) errors.push('Years of experience is required.');
      if (!formData.medicalLicenseNumber.trim()) errors.push('Medical registration / license number is required.');
      if (!formData.aboutMe.trim()) errors.push('Doctor bio / profile summary is required.');
    } else if (step === 3) {
      if (!formData.clinicName.trim()) errors.push('Hospital / clinic name is required.');
      if (!formData.address.trim()) errors.push('Clinic address is required.');
      if (!formData.consultationFee.toString().trim() || Number(formData.consultationFee) <= 0) errors.push('Consultation fee is required and must be greater than 0.');
    } else if (step === 4) {
      if (!documentFiles['medical-license']) errors.push('Medical Registration License document is required.');
      if (!documentFiles['degree-certificate']) errors.push('Medical Degree Certificate document is required.');
      if (!documentFiles['id-proof']) errors.push('Government Photo ID document is required.');
    }
    return errors;
  };

  const handleNextStep = () => {
    const errors = validateStep(currentStep);
    if (errors.length > 0) {
      setStepErrors(errors);
      return;
    }
    setStepErrors([]);
    setCurrentStep(prev => prev + 1);
  };

  const toggleLanguage = (lang: string) => {
    setFormData(prev => {
      const exists = prev.languagesSpoken.includes(lang);
      if (exists) {
        return { ...prev, languagesSpoken: prev.languagesSpoken.filter(l => l !== lang) };
      } else {
        return { ...prev, languagesSpoken: [...prev.languagesSpoken, lang] };
      }
    });
  };

  const [documentFiles, setDocumentFiles] = useState<Record<string, File | null>>({
    'medical-license': null,
    'degree-certificate': null,
    'id-proof': null,
  });
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});
  const [uploadedDocsInfo, setUploadedDocsInfo] = useState<any[]>([
    { id: 'doc-1', name: 'Medical License Certificate', type: 'PDF', status: 'Verified', uploadDate: new Date().toISOString().split('T')[0] },
    { id: 'doc-2', name: 'MD Degree Certificate', type: 'PDF', status: 'Verified', uploadDate: new Date().toISOString().split('T')[0] },
    { id: 'doc-3', name: 'Identity Proof (Aadhaar/Passport)', type: 'PDF', status: 'Verified', uploadDate: new Date().toISOString().split('T')[0] }
  ]);

  const uploadDocToSupabase = async (docType: string, fileObj?: File) => {
    setUploadingDocs(prev => ({ ...prev, [docType]: true }));
    try {
      const activeDocId = 'd1';
      const formDataUpload = new FormData();
      formDataUpload.append('documentType', docType);
      if (fileObj) {
        formDataUpload.append('file', fileObj);
      }

      const res = await fetch(`/api/doctor/${activeDocId}/documents/upload`, {
        method: 'POST',
        body: fileObj ? formDataUpload : JSON.stringify({ documentType: docType }),
        headers: fileObj ? {} : { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const docResult = await res.json();
        setUploadedDocsInfo(prev => {
          const filtered = prev.filter(d => d.name !== docType && d.name !== docResult.name);
          return [...filtered, docResult];
        });
      }
    } catch (err) {
      console.warn('Document upload error:', err);
    } finally {
      setUploadingDocs(prev => ({ ...prev, [docType]: false }));
    }
  };

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      handleTextChange('photoUrl', previewUrl);
      
      setIsUploadingPhoto(true);
      try {
        const activeDocId = 'd1';
        const formDataUpload = new FormData();
        formDataUpload.append('documentType', 'profile-photo');
        formDataUpload.append('file', file);

        const res = await fetch(`/api/doctor/${activeDocId}/documents/upload`, {
          method: 'POST',
          body: formDataUpload,
        });

        if (res.ok) {
          const uploadResult = await res.json();
          if (uploadResult.publicUrl) {
            handleTextChange('photoUrl', uploadResult.publicUrl);
          }
        }
      } catch (err) {
        console.warn('Profile photo upload error:', err);
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  const handleFileInputChange = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setDocumentFiles(prev => ({ ...prev, [docType]: selectedFile }));
      await uploadDocToSupabase(docType, selectedFile);
    }
  };

  const handleCompleteSetup = async () => {
    // Validate step 4 before submitting
    const errors = validateStep(4);
    if (errors.length > 0) {
      setStepErrors(errors);
      return;
    }
    setStepErrors([]);
    setIsSaving(true);

    const user = getUser();
    const activeDocId = user?.id || 'd-active';

    // Upload documents to Supabase Storage Bucket first
    await uploadDocToSupabase('medical-license');
    await uploadDocToSupabase('degree-certificate');
    await uploadDocToSupabase('id-proof');

    // Create updated profile payload
    const updatedProfile: DoctorProfileData = {
      id: activeDocId,
      fullName: formData.fullName.startsWith('Dr.') ? formData.fullName : `Dr. ${formData.fullName}`,
      photoUrl: formData.photoUrl || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400',
      specialization: formData.specialization,
      qualification: formData.qualification,
      yearsOfExperience: Number(formData.yearsOfExperience),
      medicalLicenseNumber: formData.medicalLicenseNumber,
      isVerified: true,
      languagesSpoken: formData.languagesSpoken,
      aboutMe: formData.aboutMe,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      clinicName: formData.clinicName,
      address: formData.address,
      stats: {
        totalConsultations: 0,
        patientsTreated: 0,
        todaysAppointments: 0,
        averageRating: 5.0,
        completedConsultations: 0
      },
      availability: {
        slots: [
          { day: 'Monday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
          { day: 'Tuesday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
          { day: 'Wednesday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
          { day: 'Thursday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
          { day: 'Friday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
          { day: 'Saturday', isWorking: true, workingHours: '10:00 AM - 02:00 PM', breakTime: 'None' },
          { day: 'Sunday', isWorking: false, workingHours: 'Off', breakTime: 'None' }
        ],
        slotDurationMinutes: formData.slotDurationMinutes,
        status: 'Available'
      },
      documents: uploadedDocsInfo
    };

    // Save doctor onboarding data to PostgreSQL Database via NestJS API
    try {
      const token = getToken();
      await fetch(`/api/doctor/${activeDocId}/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(updatedProfile)
      });
    } catch (apiErr) {
      console.warn('Backend API save warning:', apiErr);
    }

    // Save onboarding details in local storage keyed by user ID for personalized access
    localStorage.setItem('sehat_doctor_onboarding_data', JSON.stringify(updatedProfile));
    localStorage.setItem(`sehat_doctor_profile_${activeDocId}`, JSON.stringify(updatedProfile));
    localStorage.setItem('sehat_active_doctor_id', activeDocId);
    window.dispatchEvent(new Event('sehat_doctor_changed'));

    setIsSubmitted(true);
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-deadly-depths flex flex-col">
      {/* Top Bar Header */}
      <header className="bg-deep-space text-white border-b border-white/10 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-habanero text-white flex items-center justify-center font-bold text-xl leading-none">
            s
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">Sehat Setu</h1>
            <p className="text-xs text-white/60">Doctor Partner Onboarding & Profile Setup</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 text-white/90">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> All fields are mandatory
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* Form & Stepper Container */}
        <div className="flex flex-col gap-6">
          
          {/* Stepper Progress */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-aster-blue">
                Step {currentStep} of 4: {
                  currentStep === 1 ? 'Personal Information' :
                  currentStep === 2 ? 'Professional Credentials' :
                  currentStep === 3 ? 'Clinic & Fees' : 'Verification Documents'
                }
              </span>
              <span className="text-xs text-slate-500 font-semibold">{currentStep * 25}% Completed</span>
            </div>

            {/* Step Bar - can only go back to completed steps */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(step => (
                <div 
                  key={step}
                  onClick={() => {
                    if (step < currentStep) {
                      setStepErrors([]);
                      setCurrentStep(step);
                    }
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    step < currentStep
                      ? 'bg-aster-blue cursor-pointer hover:bg-aster-blue/70'
                      : step === currentStep
                      ? 'bg-aster-blue cursor-default'
                      : 'bg-slate-200 cursor-not-allowed'
                  }`}
                  title={step < currentStep ? `Go back to Step ${step}` : step === currentStep ? `Current step` : `Complete current step first`}
                />
              ))}
            </div>

            {/* Stepper Titles */}
            <div className="hidden sm:grid grid-cols-4 text-[11px] font-medium text-slate-500 mt-3 text-center">
              <span className={currentStep >= 1 ? 'text-aster-blue font-bold' : ''}>1. Basic Info</span>
              <span className={currentStep >= 2 ? 'text-aster-blue font-bold' : ''}>2. Credentials</span>
              <span className={currentStep >= 3 ? 'text-aster-blue font-bold' : ''}>3. Clinic & Fee</span>
              <span className={currentStep >= 4 ? 'text-aster-blue font-bold' : ''}>4. Verify & Submit</span>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-between">
            
            {/* STEP 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <User className="w-5 h-5 text-aster-blue" /> Personal & Contact Details
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Provide your basic identity details to display on your verified doctor profile.</p>
                </div>

                {/* Top Row: Photo Circle on Left + Name & Gender Boxes on Right */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-2">
                  {/* Left: Avatar Photo Circle with (+) Badge */}
                  <div className="relative group cursor-pointer shrink-0">
                    <input
                      type="file"
                      id="profile-photo-upload"
                      accept="image/*"
                      onChange={handlePhotoFileSelect}
                      className="hidden"
                    />
                    <label htmlFor="profile-photo-upload" className="cursor-pointer block relative">
                      <img
                        src={formData.photoUrl || DEFAULT_DOCTOR_AVATAR}
                        alt="Doctor Profile Preview"
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-aster-blue/20 shadow-md bg-slate-100 group-hover:opacity-90 transition-opacity"
                      />
                      {/* Floating Plus (+) Badge Button */}
                      <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-aster-blue hover:bg-aster-blue/90 text-white flex items-center justify-center border-2 border-white shadow-lg transition-transform group-hover:scale-110">
                        {isUploadingPhoto ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        ) : (
                          <span className="text-lg font-extrabold leading-none">+</span>
                        )}
                      </div>
                    </label>
                  </div>

                  {/* Right: Full Name & Gender Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Full Name (with Dr. Title) *</label>
                      <input 
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => handleTextChange('fullName', e.target.value)}
                        placeholder="e.g. Dr. Sarah Jenkins"
                        className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-aster-blue outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => handleTextChange('gender', e.target.value)}
                        className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-aster-blue outline-none bg-white"
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Professional Email *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input 
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleTextChange('email', e.target.value)}
                        placeholder="doctor@example.com"
                        className="w-full text-sm p-3 pl-9 rounded-xl border border-slate-300 focus:ring-2 focus:ring-aster-blue outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone Number *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input 
                        type="tel"
                        required
                        value={formData.phoneNumber}
                        onChange={(e) => handleTextChange('phoneNumber', e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full text-sm p-3 pl-9 rounded-xl border border-slate-300 focus:ring-2 focus:ring-aster-blue outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Languages Spoken */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Languages Spoken with Patients</label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_LANGUAGES.map(lang => {
                      const isSelected = formData.languagesSpoken.includes(lang);
                      return (
                        <button
                          type="button"
                          key={lang}
                          onClick={() => toggleLanguage(lang)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer font-medium ${
                            isSelected 
                              ? 'bg-aster-blue text-white border-aster-blue shadow-xs' 
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {isSelected ? `✓ ${lang}` : `+ ${lang}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Professional Credentials */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-aster-blue" /> Professional Credentials & License
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Specify your medical qualifications, primary domain, and license details.</p>
                </div>

                {/* Specialization */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary Specialization *</label>
                  <select
                    value={formData.specialization}
                    onChange={(e) => handleTextChange('specialization', e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-aster-blue outline-none bg-white font-medium text-slate-800"
                  >
                    {SPECIALIZATIONS.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                {/* Qualifications & Degrees */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Qualifications / Degrees *</label>
                  <input 
                    type="text"
                    required
                    value={formData.qualification}
                    onChange={(e) => handleTextChange('qualification', e.target.value)}
                    placeholder="e.g. MBBS, MD (Cardiology), DM"
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-aster-blue outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Commas separated degrees (e.g., MBBS, MD, DNB)</p>
                </div>

                {/* Experience & License Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Years of Clinical Experience *</label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input 
                        type="number"
                        min="0"
                        max="60"
                        required
                        value={formData.yearsOfExperience}
                        onChange={(e) => handleTextChange('yearsOfExperience', e.target.value)}
                        className="w-full text-sm p-3 pl-9 rounded-xl border border-slate-300 focus:ring-2 focus:ring-aster-blue outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Medical Registration / License No. *</label>
                    <div className="relative">
                      <Award className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input 
                        type="text"
                        required
                        value={formData.medicalLicenseNumber}
                        onChange={(e) => handleTextChange('medicalLicenseNumber', e.target.value)}
                        placeholder="e.g. MCI/2024/98712"
                        className="w-full text-sm p-3 pl-9 rounded-xl border border-slate-300 focus:ring-2 focus:ring-aster-blue outline-none uppercase tracking-wide font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* About Me Bio */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Doctor Bio / Profile Summary</label>
                  <textarea 
                    rows={4}
                    value={formData.aboutMe}
                    onChange={(e) => handleTextChange('aboutMe', e.target.value)}
                    placeholder="Describe your medical background, expertise, key clinical achievements..."
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-aster-blue outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {/* STEP 3: Clinic & Fees */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-aster-blue" /> Hospital/Clinic & Consultation Fee
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Specify your practice location and consultation pricing.</p>
                </div>

                {/* Clinic / Hospital Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary Hospital / Clinic Name *</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input 
                      type="text"
                      required
                      value={formData.clinicName}
                      onChange={(e) => handleTextChange('clinicName', e.target.value)}
                      placeholder="e.g. Apollo Medical Center / Heart Care Clinic"
                      className="w-full text-sm p-3 pl-9 rounded-xl border border-slate-300 focus:ring-2 focus:ring-aster-blue outline-none"
                    />
                  </div>
                </div>

                {/* Full Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Clinic / Practice Address *</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input 
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => handleTextChange('address', e.target.value)}
                      placeholder="Street, District, City, Pincode"
                      className="w-full text-sm p-3 pl-9 rounded-xl border border-slate-300 focus:ring-2 focus:ring-aster-blue outline-none"
                    />
                  </div>
                </div>

                {/* Consultation Fee & Slot Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Consultation Fee (₹) *</label>
                    <div className="relative">
                      <span className="text-slate-400 font-bold text-sm absolute left-3 top-3">₹</span>
                      <input 
                        type="number"
                        min="0"
                        step="50"
                        required
                        value={formData.consultationFee}
                        onChange={(e) => handleTextChange('consultationFee', e.target.value)}
                        className="w-full text-sm p-3 pl-8 rounded-xl border border-slate-300 focus:ring-2 focus:ring-aster-blue outline-none font-bold text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Slot Duration per Patient</label>
                    <select
                      value={formData.slotDurationMinutes}
                      onChange={(e) => handleTextChange('slotDurationMinutes', Number(e.target.value))}
                      className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-aster-blue outline-none bg-white font-medium"
                    >
                      <option value={15}>15 Minutes</option>
                      <option value={20}>20 Minutes</option>
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes</option>
                    </select>
                  </div>
                </div>

                {/* Working Days & Schedule Note */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Working Schedule Overview</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <Clock className="w-5 h-5 text-aster-blue shrink-0" />
                    <input 
                      type="text"
                      value={formData.availableDays}
                      onChange={(e) => handleTextChange('availableDays', e.target.value)}
                      className="w-full text-xs bg-transparent border-none outline-none font-medium text-slate-700"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Verification & Submit */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-aster-blue" /> Verification Documents Upload
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Select and upload your official medical verification files directly to the <strong>Supabase Storage Bucket</strong>.
                  </p>
                </div>

                {/* Interactive File Upload Cards */}
                <div className="space-y-4">
                  
                  {/* 1. Medical License */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-aster-blue/50 transition-all shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-aster-blue/10 text-aster-blue flex items-center justify-center font-bold shrink-0">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Medical Registration License *</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {documentFiles['medical-license'] ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {documentFiles['medical-license']?.name} ({(documentFiles['medical-license']!.size / 1024).toFixed(1)} KB)
                              </span>
                            ) : (
                              'Upload MCI / State Medical Council Registration (PDF or Image)'
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <input
                          type="file"
                          id="upload-medical-license"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => handleFileInputChange('medical-license', e)}
                          className="hidden"
                        />
                        <label
                          htmlFor="upload-medical-license"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-aster-blue bg-aster-blue/10 hover:bg-aster-blue/20 border border-aster-blue/30 px-3.5 py-2 rounded-xl cursor-pointer transition-all shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {uploadingDocs['medical-license'] ? 'Uploading to Supabase...' : documentFiles['medical-license'] ? 'Change File' : 'Select File'}
                        </label>
                        {uploadedDocsInfo.some(d => d.name === 'medical-license' || d.storagePath?.includes('medical-license')) && (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" /> Supabase Uploaded
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Degree Certificate */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-aster-blue/50 transition-all shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-aster-blue/10 text-aster-blue flex items-center justify-center font-bold shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Medical Degree Certificate (MBBS / MD) *</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {documentFiles['degree-certificate'] ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {documentFiles['degree-certificate']?.name} ({(documentFiles['degree-certificate']!.size / 1024).toFixed(1)} KB)
                              </span>
                            ) : (
                              'Upload Degree or Specialization Passing Certificate (PDF or Image)'
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <input
                          type="file"
                          id="upload-degree-certificate"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => handleFileInputChange('degree-certificate', e)}
                          className="hidden"
                        />
                        <label
                          htmlFor="upload-degree-certificate"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-aster-blue bg-aster-blue/10 hover:bg-aster-blue/20 border border-aster-blue/30 px-3.5 py-2 rounded-xl cursor-pointer transition-all shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {uploadingDocs['degree-certificate'] ? 'Uploading to Supabase...' : documentFiles['degree-certificate'] ? 'Change File' : 'Select File'}
                        </label>
                        {uploadedDocsInfo.some(d => d.name === 'degree-certificate' || d.storagePath?.includes('degree-certificate')) && (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" /> Supabase Uploaded
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Government Photo ID */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-aster-blue/50 transition-all shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-aster-blue/10 text-aster-blue flex items-center justify-center font-bold shrink-0">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Government Photo ID (Aadhaar / Passport) *</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {documentFiles['id-proof'] ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {documentFiles['id-proof']?.name} ({(documentFiles['id-proof']!.size / 1024).toFixed(1)} KB)
                              </span>
                            ) : (
                              'Upload Aadhaar Card, Passport, or Govt ID (PDF or Image)'
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <input
                          type="file"
                          id="upload-id-proof"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => handleFileInputChange('id-proof', e)}
                          className="hidden"
                        />
                        <label
                          htmlFor="upload-id-proof"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-aster-blue bg-aster-blue/10 hover:bg-aster-blue/20 border border-aster-blue/30 px-3.5 py-2 rounded-xl cursor-pointer transition-all shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {uploadingDocs['id-proof'] ? 'Uploading to Supabase...' : documentFiles['id-proof'] ? 'Change File' : 'Select File'}
                        </label>
                        {uploadedDocsInfo.some(d => d.name === 'id-proof' || d.storagePath?.includes('id-proof')) && (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" /> Supabase Uploaded
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Consent Terms Box */}
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                  <input type="checkbox" defaultChecked className="mt-0.5 accent-aster-blue cursor-pointer" />
                  <p className="leading-relaxed">
                    I certify that all medical license and qualification information submitted above is accurate and authentic under applicable Telemedicine Practice Guidelines.
                  </p>
                </div>
              </div>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="flex flex-col gap-3 mt-8 pt-4 border-t border-slate-100">
              {/* Validation Errors */}
              {stepErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-col gap-1.5">
                  <p className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    Please complete the following required fields:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {stepErrors.map((err, i) => (
                      <li key={i} className="text-[11px] text-red-600">{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => { setStepErrors([]); setCurrentStep(prev => prev - 1); }}
                    className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex items-center gap-2 text-xs font-bold text-white bg-aster-blue hover:bg-aster-blue/90 px-6 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Next Step <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleCompleteSetup}
                    className="flex items-center gap-2 text-xs font-bold text-white bg-habanero hover:bg-habanero/90 disabled:opacity-75 px-6 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Saving Profile...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Complete Profile Setup
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Completion Modal */}
      {isSubmitted && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 sm:p-8 text-center shadow-2xl border border-slate-100 relative">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Profile Setup Complete!</h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Your doctor profile for <strong className="text-slate-800">{formData.fullName}</strong> has been successfully configured and verified.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/doctor/dashboard')}
                className="w-full bg-aster-blue hover:bg-aster-blue/90 text-white font-bold text-sm py-3 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                Go to Doctor Dashboard <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigate('/doctor/profile')}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                View Full Doctor Profile Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorOnboarding;
