import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileText,
  Printer,
  ShieldCheck,
  Utensils,
  X,
  User,
  ClipboardList,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import './PrescriptionViewModal.css';
import BrandLogo from './BrandLogo';

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
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    timing?: string;
  }>;
  dietAdvice?: string;
  notes?: string;
}

interface PrescriptionViewModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  data?: PrescriptionData;
  isModal?: boolean;
}

const defaultPrescription: Required<Omit<PrescriptionData, 'notes'>> & { notes: string } = {
  id: '',
  doctorName: 'Doctor',
  doctorSpecialty: '',
  doctorRegNo: '',
  doctorHospital: 'SehatSetu Digital Health Clinic',
  patientName: 'Patient',
  patientAge: '',
  patientGender: '',
  date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
  diagnosis: '',
  symptoms: [],
  medications: [],
  dietAdvice: '',
  notes: '',
};

const PrescriptionViewModal: React.FC<PrescriptionViewModalProps> = ({
  isOpen = true,
  onClose,
  data = defaultPrescription,
  isModal = false,
}) => {
  const pageRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const rx = { ...defaultPrescription, ...data };

  useEffect(() => {
    const verificationPayload = `SEHATSETU|RX:${rx.id}|REG:${rx.doctorRegNo}|DATE:${rx.date}|PATIENT:${rx.patientName}`;
    QRCode.toDataURL(verificationPayload, {
      width: 128,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: '#050505', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch((error) => {
        console.error('Unable to generate prescription QR code:', error);
        setQrDataUrl('');
      });
  }, [rx.id, rx.doctorRegNo, rx.date, rx.patientName]);

  if (!isOpen && isModal) return null;

  const createPdf = async () => {
    if (!pageRef.current) throw new Error('Prescription page is unavailable');
    const canvas = await html2canvas(pageRef.current, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: pageRef.current.offsetWidth,
      height: pageRef.current.offsetHeight,
    });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    return pdf;
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const pdf = await createPdf();
      pdf.save(`SehatSetu_Prescription_${rx.id || 'draft'}.pdf`);
    } catch (error) {
      console.error('Unable to generate prescription PDF:', error);
      alert('The prescription PDF could not be generated. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => window.print();

  /* ── A4 prescription document ─────────────────────────────── */
  const page = (
    <div className="rx-a4-page" id="prescription-a4-page" ref={pageRef}>

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <header className="rx-letterhead">
        {/* Left: logo + brand */}
        <div className="rx-brand">
          <div className="rx-logo">
            <BrandLogo showWordmark={false} markWrapperClassName="" alt="" />
          </div>
          <div className="rx-brand-text">
            <BrandLogo showMark={false} wordmarkClassName="rx-brand-wordmark" />
          </div>
        </div>

        {/* Centre: title */}
        <div className="rx-title-center">
          <h2>MEDICAL PRESCRIPTION</h2>
          <p>Verified Electronic Medical Record</p>
        </div>

        {/* Right: verified badge + QR */}
        <div className="rx-header-right">
          <div className="rx-verification">
            <div className="rx-verification-title">
              <ShieldCheck />
              <strong>Digitally Verified</strong>
            </div>
            <span>Verified Electronic Medical Record</span>
            <span>Instant Consultation</span>
          </div>
          <div className="rx-qr" aria-label="Prescription verification QR code">
            {qrDataUrl
              ? <img src={qrDataUrl} alt={`Verification QR for ${rx.id}`} />
              : <span>QR</span>}
          </div>
        </div>
      </header>

      {/* ── PATIENT DETAILS ─────────────────────────────────────── */}
      <div className="rx-patient-simple-row">
        <div className="rx-patient-simple-item">
          <User />
          <strong>Patient:</strong> <span>{rx.patientName}</span>
        </div>
        <span className="rx-patient-divider">•</span>
        <div className="rx-patient-simple-item">
          <strong>Age / Gender:</strong> <span>{rx.patientAge ? `${rx.patientAge} Yrs` : ''} {rx.patientGender ? `/ ${rx.patientGender}` : ''}</span>
        </div>
        <span className="rx-patient-divider">•</span>
        <div className="rx-patient-simple-item">
          <strong>Diagnosis:</strong> <span>{rx.diagnosis || 'General Medical Consultation'}</span>
        </div>
        <span className="rx-patient-divider">•</span>
        <div className="rx-patient-simple-item">
          <CheckCircle2 className="rx-icon-success" />
          <strong>Consultation:</strong> <span>{rx.date}</span>
        </div>
      </div>

      {/* ── BODY SECTIONS ───────────────────────────────────────── */}
      <div className="rx-body-sections">

        {/* Reported Symptoms */}
        <div className="rx-section-label" style={{ marginTop: 14 }}>
          <ClipboardList />
          <span>Reported Symptoms</span>
        </div>
        <div className="rx-symptoms-list">
          {rx.symptoms.length > 0
            ? rx.symptoms.map((symptom, index) => (
                <span key={index} className="rx-symptom-text">• {symptom}</span>
              ))
            : <span className="rx-symptom-text rx-muted">No symptoms recorded</span>}
        </div>

        {/* Rx Medications */}
        <div className="rx-section-label" style={{ marginTop: 18 }}>
          <FileText />
          <span>Rx Prescribed Medications</span>
        </div>
        <div className="rx-table-wrap">
          <table className="rx-med-table">
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Duration</th>
                <th>Instruction</th>
              </tr>
            </thead>
            <tbody>
              {rx.medications.length > 0
                ? rx.medications.map((med, index) => (
                    <tr key={index}>
                      <td>{med.name}</td>
                      <td>{med.dosage}</td>
                      <td><span className="rx-freq-badge">{med.frequency}</span></td>
                      <td>{med.duration}</td>
                      <td><em>{med.timing || 'After Food'}</em></td>
                    </tr>
                  ))
                : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 10px', fontStyle: 'italic' }}>
                        No medications prescribed
                      </td>
                    </tr>
                  )}
            </tbody>
          </table>
        </div>

        {/* Diet & Lifestyle */}
        <div style={{ marginTop: 18 }}>
          <div className="rx-section-label rx-yellow-label">
            <Utensils />
            <span>Diet &amp; Lifestyle Instructions</span>
          </div>
          <div className="rx-diet-content">
            {rx.dietAdvice
              ? <p>{rx.dietAdvice}</p>
              : <p className="rx-muted">No specific diet instructions provided.</p>}
          </div>
        </div>

      </div>{/* end rx-body-sections */}

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="rx-footer">
        <div className="rx-auth-note">
          <ShieldCheck />
          <p>
            Generated automatically via SehatSetu Telehealth<br />
            Scan QR code on physical report to verify authenticity.
          </p>
        </div>

        <div className="rx-signature">
          <span className="rx-sig-cursive">{rx.doctorName}</span>
          <strong>{rx.doctorName}</strong>
          <small>DOCTOR SIGNATURE &amp; STAMP</small>
        </div>
      </footer>

    </div>
  );

  /* ── Viewer shell (header bar + scrollable A4 + action buttons) */
  const content = (
    <div className="rx-viewer">
      <div className="rx-viewer-header">
        <div className="rx-viewer-heading">
          <span className="rx-viewer-icon"><FileText /></span>
          <div>
            <strong>Prescription ready</strong>
            <span>{rx.patientName} · {rx.doctorName}</span>
          </div>
        </div>
        <span className="rx-viewer-status">
          <CheckCircle2 /> Consultation completed
        </span>
        {onClose && (
          <button className="rx-viewer-close" onClick={onClose} aria-label="Close prescription">
            <X />
          </button>
        )}
      </div>

      <div className="rx-page-scroll">{page}</div>

      <div className="rx-actions">
        <button className="primary" onClick={handleDownload} disabled={isGenerating}>
          <Download />
          {isGenerating ? 'Generating PDF…' : 'Download PDF Prescription'}
        </button>
        <button onClick={handlePrint}>
          <Printer /> Print / Save PDF
        </button>
      </div>
    </div>
  );

  return isModal
    ? <div className="rx-modal-backdrop">{content}</div>
    : <div className="rx-page-background">{content}</div>;
};

export default PrescriptionViewModal;
