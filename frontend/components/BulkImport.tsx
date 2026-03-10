
import React, { useState, useRef } from 'react';
import { User, Role, WorkflowRule, ApprovalType, ApprovalStep, ModuleType } from '../types';
import { CENTERS, ENTITIES, DEPARTMENTS, ALL_SUBDEPARTMENTS } from '../constants';

interface BulkImportProps {
  type: 'users' | 'workflows';
  roles?: Role[];
  users?: User[];
  onImport: (data: any[]) => void;
  onClose: () => void;
}

const BulkImport: React.FC<BulkImportProps> = ({ type, roles, users, onImport, onClose }) => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ row: number; msg: string }[]>([]);
  const [validData, setValidData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTemplate = () => {
    if (type === 'users') {
      return "Employee ID,Name,Email ID,Phone Number,Center Names,Entity Names,Departments,Subdepartments,Role Names,Status,Password\nEMP001,John Doe,john@example.com,555-0101,\"Mumbai,London\",\"Alpha Corp\",Procurement,Sourcing,Super Admin,Active,pass123";
    } else {
      return "Entity,Transaction Type,Subdepartment,Center Name,Max Amount,Step1_Type,Step1_UserEmails,Step2_Type,Step2_UserEmails,Step3_Type,Step3_UserEmails\nAlpha Corp,Purchase Request (PR),Sourcing,All Centers,50000,Reviewer,john@example.com,Approver,\"manager1@example.com;manager2@example.com\",Approver,director@example.com";
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([getTemplate()], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `p2p_${type}_template.csv`;
    a.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').filter(row => row.trim() !== '');
      const dataRows = rows.slice(1);
      
      const newErrors: { row: number; msg: string }[] = [];
      const newValidData: any[] = [];

      if (type === 'users') {
        dataRows.forEach((row, index) => {
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else current += char;
          }
          values.push(current.trim());

          const rowNum = index + 2;

          if (values.length < 9) {
            newErrors.push({ row: rowNum, msg: 'Missing mandatory columns.' });
            return;
          }

          const [empId, name, email, phone, centers, entities, depts, subdepts, roleNames, status, password] = values;
          
          if (!email.includes('@')) newErrors.push({ row: rowNum, msg: 'Invalid email format.' });
          
          const roleNamesArr = roleNames.split(',').map(r => r.trim());
          const matchedRoleIds = roleNamesArr.map(rn => roles?.find(r => r.name.toLowerCase() === rn.toLowerCase())?.id).filter(Boolean) as string[];
          
          if (matchedRoleIds.length === 0) newErrors.push({ row: rowNum, msg: `No valid roles found in '${roleNames}'.` });

          if (!newErrors.some(e => e.row === rowNum)) {
            newValidData.push({
              id: Math.random().toString(36).substr(2, 9),
              employeeId: empId,
              name,
              email,
              phoneNumber: phone,
              centerNames: centers.split(',').map(c => c.trim()).filter(Boolean),
              entityNames: entities.split(',').map(e => e.trim()).filter(Boolean),
              departments: depts.split(',').map(d => d.trim()).filter(Boolean),
              subDepartments: subdepts.split(',').map(s => s.trim()).filter(Boolean),
              roleIds: matchedRoleIds,
              isActive: (status || 'Active').toLowerCase() === 'active',
              password: password || 'Welcome@123'
            });
          }
        });
      } else {
        const subDeptGroups: Record<string, any[]> = {};
        
        dataRows.forEach((row, index) => {
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else current += char;
          }
          values.push(current.trim());

          const rowNum = index + 2;
          const [entityName, transactionType, subDept, centerName, maxAmt, s1t, s1e, s2t, s2e, s3t, s3e] = values;

          const max = maxAmt === '-1' || maxAmt.toLowerCase() === 'no limit' || !maxAmt ? null : parseInt(maxAmt);
          
          if (!ALL_SUBDEPARTMENTS.includes(subDept)) {
            newErrors.push({ row: rowNum, msg: `Subdepartment '${subDept}' not recognized.` });
          }

          const moduleType = Object.values(ModuleType).find(m => m === transactionType) as ModuleType;
          if (!moduleType) {
            newErrors.push({ row: rowNum, msg: `Transaction Type '${transactionType}' not recognized.` });
          }

          const chain: ApprovalStep[] = [];
          for (let i = 1; i <= 20; i++) {
            const typeIdx = 5 + (i - 1) * 2;
            const emailIdx = 6 + (i - 1) * 2;
            
            if (values[typeIdx] && values[emailIdx]) {
              const stepType = values[typeIdx];
              const stepEmails = values[emailIdx];
              const emailsArr = stepEmails.split(';').map(e => e.trim()).filter(Boolean);
              const userIds = emailsArr.map(email => users?.find(u => u.email.toLowerCase() === email.toLowerCase())?.id).filter(Boolean) as string[];
              
              if (userIds.length > 0) {
                chain.push({ 
                  id: Math.random().toString(36).substr(2, 9), 
                  type: stepType as ApprovalType, 
                  userIds: userIds 
                });
              } else {
                newErrors.push({ row: rowNum, msg: `No users found for Step ${i} emails: ${stepEmails}` });
              }
            } else {
              break;
            }
          }

          if (!newErrors.some(e => e.row === rowNum)) {
            const groupKey = `${entityName}|${moduleType}|${subDept}|${centerName === 'All Centers' ? '' : centerName}`;
            if (!subDeptGroups[groupKey]) subDeptGroups[groupKey] = [];
            subDeptGroups[groupKey].push({ 
              id: Math.random().toString(36).substr(2, 9), 
              entityName,
              moduleType,
              subDepartment: subDept, 
              centerName: centerName === 'All Centers' || !centerName ? undefined : centerName,
              maxAmount: max, 
              approvalChain: chain, 
              isActive: true 
            });
          }
        });

        Object.entries(subDeptGroups).forEach(([key, rules]) => {
          const [entityName, moduleType, subDept, centerName] = key.split('|');
          const sorted = rules.sort((a, b) => {
            if (a.maxAmount === null) return 1;
            if (b.maxAmount === null) return -1;
            return a.maxAmount - b.maxAmount;
          });

          let currentMin = 0;
          sorted.forEach((rule) => {
            rule.minAmount = currentMin;
            if (rule.maxAmount !== null) currentMin = rule.maxAmount + 1;
            newValidData.push(rule);
          });
        });
      }

      setErrors(newErrors);
      setValidData(newValidData);
      setStep(2);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Bulk Import: {type === 'users' ? 'User Directory' : 'Workflow Logic'}</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Data Ingestion Engine</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-transform hover:rotate-90">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-8 py-4 bg-white border-b border-slate-50 flex items-center space-x-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center space-x-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${step >= s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
                {s}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${step >= s ? 'text-slate-800' : 'text-slate-300'}`}>
                {s === 1 ? 'Upload' : s === 2 ? 'Validate' : 'Complete'}
              </span>
              {s < 3 && <div className="w-8 h-px bg-slate-100" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {step === 1 && (
            <div className="space-y-8 text-center">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-12 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer group"
              >
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-inner">
                  <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                </div>
                <h3 className="text-xl font-black text-slate-800">Select File to Process</h3>
                <p className="text-slate-400 text-sm mt-2">Support for CSV format. Drag and drop your file here.</p>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv" />
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex items-center justify-between">
                <div className="text-left">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Need a format?</h4>
                  <p className="text-xs text-slate-400 font-bold">Download the standard {type} template.</p>
                </div>
                <button 
                  onClick={downloadTemplate}
                  className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                >
                  Download Template
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className={`p-6 rounded-2xl border ${errors.length > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs font-black uppercase tracking-widest ${errors.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {errors.length > 0 ? 'Data Anomalies Found' : 'Validation Successful'}
                  </span>
                  <span className="text-xs font-black text-slate-800">{validData.length} Valid Rows Detected</span>
                </div>
                
                {errors.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {errors.map((e, i) => (
                      <div key={i} className="flex items-start space-x-3 text-xs bg-white/60 p-2 rounded-lg border border-rose-100">
                        <span className="font-black text-rose-500 min-w-[50px]">Row {e.row}</span>
                        <span className="text-slate-600 font-bold">{e.msg}</span>
                      </div>
                    ))}
                  </div>
                )}

                {errors.length === 0 && (
                  <div className="flex flex-col items-center py-6">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 mb-3">
                      <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p className="text-emerald-700 font-black text-sm uppercase tracking-widest">Ready for integration</p>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Back to Upload
                </button>
                <button 
                  disabled={validData.length === 0}
                  onClick={() => {
                    onImport(validData);
                    setStep(3);
                  }}
                  className="flex-[2] py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                >
                  Import {validData.length} Records
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-12 space-y-6 animate-in zoom-in duration-300">
              <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800">Integrity Check Complete</h3>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2">{validData.length} records pushed to production state</p>
              </div>
              <button 
                onClick={onClose}
                className="px-12 py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-slate-800 transition-all shadow-xl"
              >
                Close Engine
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkImport;
