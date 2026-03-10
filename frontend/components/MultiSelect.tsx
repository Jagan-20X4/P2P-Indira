
import React, { useState, useRef, useEffect } from 'react';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ options, selected, onChange, placeholder = "Select...", label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const toggleOption = (option: string) => {
    const isSelected = selected.includes(option);
    const newSelected = isSelected 
      ? selected.filter(s => s !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  const toggleAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const filteredOptions = options.filter(o => 
    o.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAllSelected = options.length > 0 && selected.length === options.length;

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {label && <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[46px] p-2 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap gap-1.5 cursor-pointer hover:border-indigo-400 hover:bg-white transition-all focus-within:ring-4 focus-within:ring-indigo-500/10 shadow-sm"
      >
        {selected.length === 0 && (
          <span className="text-slate-400 text-sm px-2 py-1.5 font-medium">{placeholder}</span>
        )}
        {selected.map(item => (
          <span 
            key={item} 
            className="inline-flex items-center bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm border border-indigo-500"
          >
            {item}
            <button 
              onClick={(e) => { e.stopPropagation(); toggleOption(item); }}
              className="ml-2 hover:text-indigo-200 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        ))}
        <div className="flex-1 min-w-[30px] flex items-center justify-end px-1">
          <svg className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-slate-50 bg-slate-50/50">
            <div className="relative">
              <input 
                autoFocus
                type="text"
                placeholder="Search options..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 bg-white font-bold text-slate-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 p-1">
            {options.length > 0 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleAll(); }}
                className="w-full text-left px-4 py-2.5 text-xs font-black uppercase tracking-widest flex items-center justify-between hover:bg-indigo-50 group transition-colors rounded-xl mb-1"
              >
                <span className={isAllSelected ? "text-indigo-600" : "text-slate-500"}>Select All</span>
                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isAllSelected ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100' : 'border-slate-200 bg-white'}`}>
                  {isAllSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                </div>
              </button>
            )}

            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => {
                const isSelected = selected.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleOption(opt); }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-xl"
                  >
                    <span>{opt}</span>
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-100' : 'border-slate-200 bg-white'}`}>
                      {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-6 text-center text-[10px] text-slate-400 font-black uppercase tracking-widest">
                {searchTerm ? 'No results found' : 'No options available'}
              </div>
            )}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t border-slate-50 bg-slate-50/30">
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange([]); }}
                className="w-full py-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-red-500 transition-colors"
              >
                Clear All Selections
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
