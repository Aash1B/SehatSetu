import React from 'react';
import { Download, Printer, CheckCircle2, ShieldCheck, X, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  doctorName: "Dr. Ananya Sharma",
  doctorSpecialty: "General Physician & Telehealth Specialist",
  doctorRegNo: "MCI-IND-98742",
  doctorHospital: "SehatSetu Digital Health Clinic",
  patientName: "Sunita Devi",
  patientAge: 31,
  patientGender: "Female",
  date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
  diagnosis: "Acute Viral Fever with Body Ache",
  symptoms: ["Persistent Fever (4 days)", "Body ache & Fatigue"],
  medications: [
    { name: "Tab. Paracetamol 650mg", dosage: "650 mg", frequency: "1-0-1", duration: "5 days", timing: "After Food" },
    { name: "Tab. Cetirizine 10mg", dosage: "10 mg", frequency: "0-0-1", duration: "3 days", timing: "SOS at Night" }
  ],
  dietAdvice: "Increase fluid intake (min 3L/day), avoid spicy and oily foods, take warm water & rest.",
  notes: "Follow up in 5 days if fever persists. Complete CBC & Dengue NS1 test if body ache continues."
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

  const handleDownload = async () => {
    const filename = `SehatSetu_Prescription_${rx.id || 'RX-2026'}.pdf`;
    try {
      const element = document.getElementById('prescription-document');
      if (element) {
        // Temporarily adjust element styles for high-dpi capture without scrollbars
        const origOverflow = element.style.overflowY;
        const origMaxHeight = element.style.maxHeight;
        element.style.overflowY = 'visible';
        element.style.maxHeight = 'none';

        const canvas = await html2canvas(element, {
          scale: 3, // Ultra-HD High Resolution
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight
        });

        // Restore original scroll styles immediately
        element.style.overflowY = origOverflow;
        element.style.maxHeight = origMaxHeight;

        const imgData = canvas.toDataURL('image/png', 1.0);
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Single-page dynamic canvas PDF matching exact screen aspect ratio
        const pdf = new jsPDF('p', 'mm', [imgWidth, Math.max(imgHeight, 297)]);
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

        pdf.save(filename);
        return;
      }
    } catch (err) {
      console.warn('html2canvas PDF generation error, using direct PDF fallback:', err);
    }

    // Direct jsPDF Builder Fallback
    try {
      const doc = new jsPDF();
      doc.setFillColor(29, 78, 216);
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('SehatSetu Medical Prescription', 14, 18);
      doc.setFontSize(9);
      doc.text(`Rx ID: ${rx.id || 'RX-2026'} | Date: ${rx.date}`, 14, 25);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.text(`Doctor: ${rx.doctorName}`, 14, 40);
      doc.setFontSize(10);
      doc.text(`${rx.doctorSpecialty} (Reg No: ${rx.doctorRegNo})`, 14, 46);

      doc.setFontSize(11);
      doc.text(`Patient: ${rx.patientName} (${rx.patientAge} Yrs / ${rx.patientGender})`, 14, 58);
      doc.text(`Diagnosis: ${rx.diagnosis}`, 14, 64);

      doc.setFontSize(12);
      doc.text('Prescribed Medications:', 14, 78);
      doc.setFontSize(10);
      let y = 88;
      rx.medications?.forEach((m) => {
        doc.text(`• ${m.name} - ${m.dosage} | Frequency: ${m.frequency} | Duration: ${m.duration} (${m.timing || 'After Food'})`, 14, y);
        y += 8;
      });

      if (rx.dietAdvice) {
        y += 6;
        doc.setFontSize(12);
        doc.text('Diet & Lifestyle Advice:', 14, y);
        y += 8;
        doc.setFontSize(10);
        doc.text(rx.dietAdvice, 14, y);
      }

      doc.save(filename);
    } catch (e) {
      console.error('Failed to generate PDF:', e);
    }
  };

  const content = (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '24px',
      maxWidth: '680px',
      width: '100%',
      maxHeight: '88vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
      border: '1px solid #e2e8f0',
      margin: 'auto'
    }}>
      
      {/* Printable Document Container containing Header + Body */}
      <div id="prescription-document" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }} className="custom-scrollbar">
        
        {/* Top Banner (Inside Document Padding) */}
        <div style={{
          background: 'linear-gradient(135deg, #1d4ed8 0%, #4338ca 50%, #1e40af 100%)',
          color: '#ffffff',
          padding: '16px 20px',
          borderRadius: '16px',
          margin: '20px 20px 0 20px',
          position: 'relative',
          boxShadow: '0 4px 12px rgba(29, 78, 216, 0.2)'
        }}>
          {onClose && (
            <button 
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 255, 255, 0.25)' }}>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#fbbf24', fontFamily: 'serif' }}>Rx</span>
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 'bold', margin: 0, letterSpacing: '-0.01em' }}>SehatSetu Medical Prescription</h2>
              <p style={{ fontSize: '11px', color: '#dbeafe', margin: '2px 0 0 0' }}>Verified Electronic Medical Record • Instant Consultation</p>
            </div>
          </div>
        </div>

        {/* Main Prescription Content Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Doctor Info Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>{rx.doctorName}</h3>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#2563eb', margin: '2px 0' }}>{rx.doctorSpecialty}</p>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '1px 0' }}>Reg No: <span style={{ fontFamily: 'monospace', color: '#475569', fontWeight: 'bold' }}>{rx.doctorRegNo}</span></p>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{rx.doctorHospital}</p>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
              <span style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontSize: '11px', fontWeight: 'bold', padding: '3px 10px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Digitally Verified
              </span>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Rx ID: <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#1e293b' }}>{rx.id}</span></p>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Date: <span style={{ fontWeight: '600', color: '#1e293b' }}>{rx.date}</span></p>
            </div>
          </div>

          {/* Patient Details Box */}
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '14px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '11px' }}>
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '9px', marginBottom: '2px' }}>PATIENT NAME</span>
              <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '13px', display: 'block' }}>{rx.patientName}</span>
            </div>
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '9px', marginBottom: '2px' }}>AGE / GENDER</span>
              <span style={{ fontWeight: '600', color: '#334155', display: 'block' }}>{rx.patientAge} Yrs / {rx.patientGender}</span>
            </div>
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '9px', marginBottom: '2px' }}>DIAGNOSIS</span>
              <span style={{ fontWeight: 'bold', color: '#1e3a8a', display: 'block', lineHeight: 1.2 }}>{rx.diagnosis}</span>
            </div>
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '9px', marginBottom: '2px' }}>CONSULTATION</span>
              <span style={{ fontWeight: 'bold', color: '#047857', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed
              </span>
            </div>
          </div>

          {/* Reported Symptoms */}
          {rx.symptoms && rx.symptoms.length > 0 && (
            <div>
              <h4 style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>REPORTED SYMPTOMS</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {rx.symptoms.map((s, idx) => (
                  <span key={idx} style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '11px', fontWeight: '600', padding: '4px 10px', borderRadius: '12px' }}>
                    • {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prescribed Medications Table */}
          <div>
            <h4 style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText className="w-3.5 h-3.5 text-blue-600" /> RX PRESCRIBED MEDICATIONS
            </h4>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
              <table style={{ width: '100%', textAlign: 'left', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f8fafc', color: '#334155', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '10px 12px' }}>Medicine Name</th>
                    <th style={{ padding: '10px 12px' }}>Dosage</th>
                    <th style={{ padding: '10px 12px' }}>Frequency</th>
                    <th style={{ padding: '10px 12px' }}>Duration</th>
                    <th style={{ padding: '10px 12px' }}>Instruction</th>
                  </tr>
                </thead>
                <tbody>
                  {rx.medications?.map((med, index) => (
                    <tr key={index} style={{ borderBottom: index < rx.medications.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#0f172a' }}>{med.name}</td>
                      <td style={{ padding: '10px 12px', fontWeight: '500', color: '#475569' }}>{med.dosage}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: 'bold', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' }}>
                          {med.frequency}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{med.duration}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontStyle: 'italic' }}>{med.timing || "After Food"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Diet & Advice */}
          {rx.dietAdvice && (
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '16px', padding: '14px' }}>
              <h4 style={{ fontSize: '10px', fontWeight: 'bold', color: '#78350f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                🥗 DIET & LIFESTYLE INSTRUCTIONS
              </h4>
              <p style={{ fontSize: '12px', color: '#92400e', margin: 0, fontWeight: '500', lineHeight: 1.5 }}>{rx.dietAdvice}</p>
            </div>
          )}

          {/* Signature Footer */}
          <div style={{ paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.4 }}>
              <p style={{ margin: 0 }}>Generated automatically via SehatSetu Telehealth</p>
              <p style={{ margin: 0 }}>Scan QR code on physical report to verify authenticity.</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ borderBottom: '1px solid #0f172a', paddingBottom: '2px', paddingLeft: '12px', paddingRight: '12px', marginBottom: '2px', display: 'inline-block' }}>
                <span style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '18px', color: '#091e42', fontWeight: 'bold' }}>{rx.doctorName}</span>
              </div>
              <p style={{ fontSize: '8px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.1em', margin: 0 }}>DOCTOR SIGNATURE & STAMP</p>
            </div>
          </div>

        </div>

      </div>

      {/* Fixed Bottom Action Buttons Bar */}
      <div style={{ padding: '16px 20px', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
        <button
          onClick={handleDownload}
          style={{
            flex: 1,
            padding: '12px 16px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '13px',
            borderRadius: '14px',
            border: 'none',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <Download className="w-4 h-4" /> Download PDF Prescription
        </button>
        <button
          onClick={handlePrint}
          style={{
            padding: '12px 18px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#334155',
            fontWeight: 'bold',
            fontSize: '13px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <Printer className="w-4 h-4 text-slate-600" /> Print / Save PDF
        </button>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '12px 20px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              fontWeight: 'bold',
              fontSize: '13px',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        )}
      </div>

    </div>
  );

  if (isModal) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)'
      }}>
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      {content}
    </div>
  );
};

export default PrescriptionViewModal;
