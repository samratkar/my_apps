import React, { useState } from 'react';
import { User, Stethoscope, ArrowRight } from 'lucide-react';
import Button from './Button';

interface DetailsInputViewProps {
  onSubmit: (doctorName: string, patientName: string) => void;
  onCancel: () => void;
}

const DetailsInputView: React.FC<DetailsInputViewProps> = ({ onSubmit, onCancel }) => {
  const [doctorName, setDoctorName] = useState('');
  const [patientName, setPatientName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (doctorName.trim() && patientName.trim()) {
      onSubmit(doctorName, patientName);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-in fade-in zoom-in duration-300">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100 max-w-md w-full">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Session Details</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="doctorName" className="block text-sm font-medium text-slate-700 mb-2">
              Doctor Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Stethoscope className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                id="doctorName"
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 transition-colors"
                placeholder="Dr. Smith"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="patientName" className="block text-sm font-medium text-slate-700 mb-2">
              Patient Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                id="patientName"
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 transition-colors"
                placeholder="John Doe"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="secondary" 
              className="flex-1"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!doctorName.trim() || !patientName.trim()}
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DetailsInputView;