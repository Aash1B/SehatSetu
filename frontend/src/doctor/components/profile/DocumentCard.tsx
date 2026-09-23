import React, { useRef, useState } from 'react';
import SectionCard from '../SectionCard';
import { DocumentInfo } from '../../types/profile.types';
import { CheckCircle2, Clock, FileText, ExternalLink, AlertCircle, Upload, FileSignature, Loader2, RefreshCw } from 'lucide-react';
import { getToken } from '../../../auth/authStorage';
import { API_BASE_URL } from '../../../patient/utils/constants';

interface Props {
  documents: DocumentInfo[];
  doctorId?: string;
  onRefresh?: () => void;
}

// Documents list including Doctor's Digital Signature
const ONBOARDING_DOCS = [
  {
    key: 'medical-license',
    label: 'Medical Registration License',
    description: 'State Medical Council registration certificate',
    icon: FileText,
  },
  {
    key: 'degree-certificate',
    label: 'Medical Degree Certificate',
    description: 'MBBS / MD / MS or equivalent degree certificate',
    icon: FileText,
  },
  {
    key: 'id-proof',
    label: 'Government Photo ID',
    description: 'Aadhaar, Passport, Driving License or Voter ID',
    icon: FileText,
  },
  {
    key: 'signature',
    label: "Doctor's Digital Signature",
    description: 'Official digital signature image used on prescriptions (PNG, JPG, WebP)',
    icon: FileSignature,
  },
];

const DocumentCard: React.FC<Props> = ({ documents, doctorId, onRefresh }) => {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Match uploaded documents to known slots (with signature fallback to localStorage)
  const findDoc = (key: string): DocumentInfo | undefined => {
    if (key === 'signature') {
      const localSig = localStorage.getItem('sehatsetu_doctor_signature') || localStorage.getItem('doctor_signature_url');
      const found = documents.find((d: any) => {
        const haystack = [d.name, d.storagePath, d.documentType, d.type].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes('signature');
      });
      if (found) return found;
      if (localSig) {
        return {
          id: 'sig-local',
          name: "Doctor's Signature Image",
          type: 'PNG/JPEG',
          status: 'Verified',
          uploadDate: new Date().toISOString().split('T')[0],
          publicUrl: localSig,
        };
      }
    }

    return documents.find((d: any) => {
      const haystack = [d.name, d.storagePath, d.documentType, d.type].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(key.toLowerCase());
    });
  };

  const handleFileChange = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (key === 'signature' && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Please upload a valid image file (PNG, JPEG, WebP) for signature.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Document size must be less than 10MB.');
      return;
    }

    setUploadingKey(key);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;

        if (key === 'signature') {
          localStorage.setItem('sehatsetu_doctor_signature', dataUrl);
          localStorage.setItem('doctor_signature_url', dataUrl);
        }

        if (doctorId) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('documentType', key);
          try {
            await fetch(`${API_BASE_URL}/doctor/${doctorId}/documents/upload`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${getToken()}` },
              body: formData,
            });
          } catch (err) {
            console.warn('Document server upload warning:', err);
          }
        }

        if (onRefresh) onRefresh();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to upload document:', err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploadingKey(null);
      if (fileInputRefs.current[key]) {
        fileInputRefs.current[key]!.value = '';
      }
    }
  };

  return (
    <SectionCard>
      <div className="space-y-3">
        {ONBOARDING_DOCS.map(({ key, label, description, icon: Icon }) => {
          const doc = findDoc(key);
          const isUploading = uploadingKey === key;

          return (
            <div
              key={key}
              className={`p-3.5 sm:p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                doc ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-50 border-dashed border-slate-200'
              }`}
            >
              {/* Hidden file input for uploading */}
              <input
                type="file"
                ref={(el) => { fileInputRefs.current[key] = el; }}
                onChange={(e) => handleFileChange(key, e)}
                accept={key === 'signature' ? 'image/png,image/jpeg,image/webp' : 'application/pdf,image/png,image/jpeg,image/webp'}
                className="hidden"
              />

              {/* Left: icon + info */}
              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                <div
                  className={`p-2.5 rounded-xl shrink-0 mt-0.5 sm:mt-0 ${
                    doc ? 'bg-[#223382]/10 text-[#223382]' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-bold truncate ${doc ? 'text-slate-900' : 'text-slate-500'}`}>
                      {label}
                    </p>
                    {key === 'signature' && (
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full shrink-0">
                        Prescription Badge
                      </span>
                    )}
                  </div>
                  {doc ? (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      Uploaded on {doc.uploadDate} &bull; {doc.type || (key === 'signature' ? 'Image' : 'PDF')}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{description}</p>
                  )}
                </div>
              </div>

              {/* Bottom on mobile / Right on desktop: status + view + upload actions */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                {doc ? (
                  <>
                    <div className="flex items-center gap-2">
                      {/* Signature Preview thumbnail if available */}
                      {key === 'signature' && doc.publicUrl && (
                        <img
                          src={doc.publicUrl}
                          alt="Signature Preview"
                          className="h-7 max-w-[70px] object-contain border border-slate-200 rounded p-0.5 bg-white"
                        />
                      )}

                      {/* Status badge */}
                      {doc.status === 'Verified' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </span>
                      ) : doc.status === 'Pending' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full shrink-0">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto sm:ml-0">
                      {/* View button */}
                      {doc.publicUrl && (
                        <a
                          href={doc.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#223382] bg-[#223382]/8 hover:bg-[#223382]/15 border border-[#223382]/20 px-3.5 py-1.5 rounded-full transition-colors shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View</span>
                        </a>
                      )}

                      {/* Re-upload / Update button */}
                      <button
                        onClick={() => fileInputRefs.current[key]?.click()}
                        disabled={isUploading}
                        title="Upload new document or signature"
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer shrink-0"
                      >
                        {isUploading ? (
                          <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                        ) : (
                          <RefreshCw className="w-3 h-3 text-slate-500" />
                        )}
                        <span>Change</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => fileInputRefs.current[key]?.click()}
                    disabled={isUploading}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#223382] hover:bg-[#1a286b] px-5 py-2.5 rounded-xl sm:rounded-full shadow-2xs transition-colors cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        Upload {key === 'signature' ? 'Signature' : 'Document'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
};

export default DocumentCard;

