import React from 'react';
import SectionCard from '../SectionCard';
import { DocumentInfo } from '../../types/profile.types';
import { CheckCircle2, Clock, FileText, Upload } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface Props {
  documents: DocumentInfo[];
}

const DocumentCard: React.FC<Props> = ({ documents }) => {
  return (
    <SectionCard title="Professional Documents" subtitle="Certificates & Licenses">
      <div className="space-y-3 mb-4">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded shadow-sm text-aster-blue">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-deep-space">{doc.name}</p>
                <p className="text-xs text-gray-500">Uploaded on {doc.uploadDate} • {doc.type}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              {doc.status === 'Verified' ? (
                <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified
                </span>
              ) : doc.status === 'Pending' ? (
                <span className="flex items-center gap-1 text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                  <Clock className="w-3.5 h-3.5" />
                  Pending
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                  Rejected
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <button className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-lg hover:bg-gray-50 hover:border-aster-blue transition-colors text-gray-500 hover:text-aster-blue group">
        <Upload className="w-6 h-6 mb-2 text-gray-400 group-hover:text-aster-blue" />
        <span className="text-sm font-medium">Upload New Document</span>
        <span className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 5MB</span>
      </button>
    </SectionCard>
  );
};

export default DocumentCard;
