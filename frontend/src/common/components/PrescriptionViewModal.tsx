import React, { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Printer,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Utensils,
  X,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import './PrescriptionViewModal.css';

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
      width: 256,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: '#050505', light: '#ffffff' },
    }).then(setQrDataUrl).catch((error) => {
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
      pdf.save(`SehatSetu_Prescription_${rx.id}.pdf`);
    } catch (error) {
      console.error('Unable to generate prescription PDF:', error);
      alert('The prescription PDF could not be generated. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => window.print();

  const page = (
    <div className="rx-a4-page" id="prescription-a4-page" ref={pageRef}>
      <div className="rx-watermark rx-watermark-one">⌁</div>
      <header className="rx-letterhead">
        <div className="rx-brand">
          <div className="rx-logo"><span>R</span><sup>x</sup></div>
          <div><h1>SehatSetu</h1><p>Digital Health Clinic</p></div>
        </div>
        <div className="rx-verification">
          <ShieldCheck /><div><strong>Digitally Verified</strong><span>Verified Electronic Medical Record</span><span>Instant Consultation</span></div>
        </div>
        <div className="rx-qr" aria-label="Prescription verification code">
          {qrDataUrl ? <img src={qrDataUrl} alt={`Verification QR for ${rx.id}`} /> : <span>QR</span>}
        </div>
      </header>

      <div className="rx-title-row">
        <div><h2>MEDICAL PRESCRIPTION</h2><p>Verified Electronic Medical Record</p></div>
        <dl><div><dt>Rx ID</dt><dd>{rx.id}</dd></div><div><dt>Reg No</dt><dd>{rx.doctorRegNo}</dd></div><div><dt>Date</dt><dd>{rx.date}</dd></div></dl>
      </div>

      <section className="rx-doctor">
        <div className="rx-doctor-avatar"><Stethoscope /></div>
        <div><h3>{rx.doctorName}</h3><strong>{rx.doctorSpecialty}</strong><p>{rx.doctorHospital}</p></div>
      </section>

      <section className="rx-patient-grid">
        <div><UserRound /><span>PATIENT NAME</span><strong>{rx.patientName}</strong></div>
        <div><CalendarDays /><span>AGE / GENDER</span><strong>{rx.patientAge} Yrs / {rx.patientGender}</strong></div>
        <div><ClipboardList /><span>DIAGNOSIS</span><strong>{rx.diagnosis}</strong></div>
        <div><Stethoscope /><span>CONSULTATION</span><strong className="rx-completed"><CheckCircle2 /> Completed</strong></div>
      </section>

      <section className="rx-section rx-symptoms">
        <h4><ClipboardList /> REPORTED SYMPTOMS</h4>
        <div>{rx.symptoms.map((symptom, index) => <span key={index}>• {symptom}</span>)}</div>
      </section>

      <section className="rx-section rx-medications">
        <h4><FileText /> RX PRESCRIBED MEDICATIONS</h4>
        <div className="rx-table-wrap"><table><thead><tr><th>Medicine Name</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instruction</th></tr></thead>
          <tbody>{rx.medications.map((medication, index) => <tr key={index}><td>{medication.name}</td><td>{medication.dosage}</td><td><b>{medication.frequency}</b></td><td>{medication.duration}</td><td><em>{medication.timing || 'After Food'}</em></td></tr>)}</tbody>
        </table></div>
      </section>

      <section className="rx-diet"><h4><Utensils /> DIET &amp; LIFESTYLE INSTRUCTIONS</h4><p>{rx.dietAdvice}</p></section>

      <footer className="rx-footer">
        <div className="rx-auth-note"><ShieldCheck /><p>Generated automatically via SehatSetu Telehealth<br />Scan QR code on physical report to verify authenticity.</p></div>
        <div className="rx-signature"><span>{rx.doctorName}</span><strong>{rx.doctorName}</strong><small>DOCTOR SIGNATURE &amp; STAMP</small></div>
      </footer>
    </div>
  );

  const content = <div className="rx-viewer">
    <div className="rx-viewer-header">
      <div className="rx-viewer-heading">
        <span className="rx-viewer-icon"><FileText /></span>
        <div><strong>Prescription ready</strong><span>{rx.patientName} · {rx.doctorName}</span></div>
      </div>
      <span className="rx-viewer-status"><CheckCircle2 /> Consultation completed</span>
      {onClose && <button className="rx-viewer-close" onClick={onClose} aria-label="Close prescription"><X /></button>}
    </div>
    <div className="rx-page-scroll">{page}</div><div className="rx-actions">
    <button className="primary" onClick={handleDownload} disabled={isGenerating}><Download /> {isGenerating ? 'Generating A4 PDF…' : 'Download PDF Prescription'}</button>
    <button onClick={handlePrint}><Printer /> Print / Save PDF</button>
  </div></div>;

  return isModal
    ? <div className="rx-modal-backdrop">{content}</div>
    : <div className="rx-page-background">{content}</div>;
};

export default PrescriptionViewModal;
