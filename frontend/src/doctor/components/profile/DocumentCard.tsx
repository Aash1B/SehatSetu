import React from 'react';
import SectionCard from '../SectionCard';
import { DocumentInfo } from '../../types/profile.types';
import { CheckCircle2, Clock, FileText, ExternalLink, AlertCircle } from 'lucide-react';

interface Props {
  documents: DocumentInfo[];
}

// The three documents collected during doctor onboarding
const ONBOARDING_DOCS = [
  {
    key: 'medical-license',
    label: 'Medical Registration License',
    description: 'State Medical Council registration certificate',
  },
  {
    key: 'degree-certificate',
    label: 'Medical Degree Certificate',
    description: 'MBBS / MD / MS or equivalent degree certificate',
  },
  {
    key: 'id-proof',
    label: 'Government Photo ID',
    description: 'Aadhaar, Passport, Driving License or Voter ID',
  },
];

const DocumentCard: React.FC<Props> = ({ documents }) => {
  // Match uploaded documents to the known onboarding slots.
  // The backend stores the doc type key in storagePath (e.g. "doctor-documents/xxx/medical-license-1234.pdf")
  const findDoc = (key: string): DocumentInfo | undefined =>
    documents.find((d: any) => {
      const haystack = [
        d.name,
        d.storagePath,
        d.documentType,
        d.type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(key.toLowerCase());
    });

  return (
    <SectionCard title="Professional Documents" subtitle="Certificates & Licenses">
      <div className="space-y-3">
        {ONBOARDING_DOCS.map(({ key, label, description }) => {
          const doc = findDoc(key);

          return (
            <div
              key={key}
              className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                doc
                  ? 'bg-white border-slate-200 shadow-sm'
                  : 'bg-slate-50 border-dashed border-slate-200'
              }`}
            >
              {/* Left: icon + info */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    doc ? 'bg-[#223382]/10 text-[#223382]' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${doc ? 'text-slate-900' : 'text-slate-500'}`}>
                    {label}
                  </p>
                  {doc ? (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Uploaded on {doc.uploadDate} &bull; {doc.type || 'PDF'}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-0.5">{description}</p>
                  )}
                </div>
              </div>

              {/* Right: status + view */}
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {doc ? (
                  <>
                    {/* Status badge */}
                    {doc.status === 'Verified' ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    ) : doc.status === 'Pending' ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                        <Clock className="w-3.5 h-3.5" />
                        Pending
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Rejected
                      </span>
                    )}

                    {/* View button */}
                    {doc.publicUrl ? (
                      <a
                        href={doc.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-semibold text-[#223382] bg-[#223382]/8 hover:bg-[#223382]/15 border border-[#223382]/20 px-2.5 py-1 rounded-full transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View
                      </a>
                    ) : null}
                  </>
                ) : (
                  <span className="text-xs text-slate-400 font-medium italic">Not uploaded yet</span>
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
