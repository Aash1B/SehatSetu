import React from 'react';
import { Download, Printer, CheckCircle2, ShieldCheck, X, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface PrescriptionData {
  id?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorRegNo?: string;
  doctorHospital?: string;
  patientName?: string;
  patientAge?: string | number;
  patientGender?: string;
  date?: string;
  diagnosis?: string;
  symptoms?: string[];
  medications?: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    timing?: string;
  }[];
  dietAdvice?: string;
  notes?: string;
}

interface PrescriptionViewModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  data?: PrescriptionData;
  isModal?: boolean;
}

const defaultPrescription: PrescriptionData = {
  id: "RX-2026-8849",
  doctorName: "Dr. Sarah Jenkins",
  doctorSpecialty: "Cardiologist & Internal Medicine",
  doctorRegNo: "MCI-IND-98742",
  doctorHospital: "SehatSetu Digital Health Clinic",
  patientName: "Ananya Sharma",
  patientAge: 28,
  patientGender: "Female",
  date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
  diagnosis: "Mild Hypertension & Fatigue",
  symptoms: ["Chest discomfort", "Fatigue", "Mild Headache"],
  medications: [
    { name: "Telmisartan 40mg", dosage: "40 mg", frequency: "1-0-0", duration: "14 days", timing: "Before Breakfast" },
    { name: "Multivitamin Extra", dosage: "1 Tablet", frequency: "0-1-0", duration: "30 days", timing: "After Lunch" },
    { name: "Paracetamol 650mg", dosage: "650 mg", frequency: "SOS (as needed)", duration: "3 days", timing: "After Food" }
  ],
  dietAdvice: "Low sodium diet (< 2g/day), drink 3L water daily, 30 mins light daily walking.",
  notes: "Follow up in 2 weeks or if symptoms persist. Get BP recorded twice daily."
};

const PrescriptionViewModal: React.FC<PrescriptionViewModalProps> = ({
  isOpen = true,
  onClose,
  data = defaultPrescription,
  isModal = false
}) => {
  const navigate = useNavigate();
  const rx = { ...defaultPrescription, ...data };

  if (!isOpen && isModal) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    alert("📄 Prescription PDF downloaded successfully!");
  };

  const content = (
    <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden my-6">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-deep-space text-white p-6 relative">
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center justify-between pr-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
              <span className="text-2xl font-black text-amber-400">Rx</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">SehatSetu Medical Prescription</h2>
              <p className="text-xs text-blue-200">Verified Electronic Medical Record • Instant Consultation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Prescription Content Body */}
      <div className="p-8 space-y-6">
        
        {/* Doctor & Hospital Details Header */}
        <div className="flex justify-between items-start pb-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{rx.doctorName}</h3>
            <p className="text-sm font-semibold text-blue-600">{rx.doctorSpecialty}</p>
            <p className="text-xs text-gray-500 mt-0.5">Reg No: {rx.doctorRegNo}</p>
            <p className="text-xs text-gray-500">{rx.doctorHospital}</p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-3 py-1 rounded-full mb-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Digitally Signed
            </span>
            <p className="text-xs text-gray-500">Rx ID: <span className="font-mono font-bold text-gray-700">{rx.id}</span></p>
            <p className="text-xs text-gray-500">Date: <span className="font-semibold text-gray-700">{rx.date}</span></p>
          </div>
        </div>

        {/* Patient Details Row */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-gray-400 block font-medium">Patient Name</span>
            <span className="font-bold text-gray-800 text-sm">{rx.patientName}</span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">Age / Gender</span>
            <span className="font-semibold text-gray-800">{rx.patientAge} Yrs / {rx.patientGender}</span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">Diagnosis</span>
            <span className="font-semibold text-blue-900">{rx.diagnosis}</span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">Consultation</span>
            <span className="font-semibold text-green-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Completed
            </span>
          </div>
        </div>

        {/* Reported Symptoms */}
        {rx.symptoms && rx.symptoms.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Reported Symptoms</h4>
            <div className="flex flex-wrap gap-2">
              {rx.symptoms.map((s, idx) => (
                <span key={idx} className="bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium px-3 py-1 rounded-full">
                  • {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Prescribed Medications Table */}
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" /> Rx Prescribed Medications
          </h4>
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                <tr>
                  <th className="p-3">Medicine Name</th>
                  <th className="p-3">Dosage</th>
                  <th className="p-3">Frequency</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Instruction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rx.medications?.map((med, index) => (
                  <tr key={index} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-3 font-bold text-gray-900">{med.name}</td>
                    <td className="p-3 font-medium text-gray-600">{med.dosage}</td>
                    <td className="p-3 font-semibold text-blue-700 bg-blue-50/80 rounded px-2 py-0.5">{med.frequency}</td>
                    <td className="p-3 text-gray-600">{med.duration}</td>
                    <td className="p-3 text-gray-500 italic">{med.timing || "After Food"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Diet & Advice */}
        {rx.dietAdvice && (
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">🥗 Diet & Lifestyle Instructions</h4>
            <p className="text-xs text-amber-800 leading-relaxed font-medium">{rx.dietAdvice}</p>
          </div>
        )}

        {/* Doctor Signature & Stamp */}
        <div className="pt-4 border-t border-gray-200 flex justify-between items-end">
          <div className="text-xs text-gray-400">
            <p>Generated automatically via SehatSetu Telehealth</p>
            <p>Scan QR code on physical report to verify authenticity.</p>
          </div>
          <div className="text-right">
            <div className="inline-block border-b-2 border-gray-800 pb-1 px-4 mb-1">
              <span className="font-serif italic text-lg text-blue-900 font-bold tracking-wider">{rx.doctorName}</span>
            </div>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Doctor Signature & Stamp</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4 border-t border-gray-100 print:hidden">
          <button
            onClick={handleDownload}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download PDF Prescription
          </button>
          <button
            onClick={handlePrint}
            className="py-3 px-6 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl transition-all"
            >
              Close
            </button>
          )}
        </div>

      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      {content}
    </div>
  );
};

export default PrescriptionViewModal;
