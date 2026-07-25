"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function CustomSelect({ value, onChange, options, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative group min-w-[160px]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-700 font-medium capitalize"
      >
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
          <Icon size={16} />
        </div>
        <span>{selectedOption.label}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="py-1 max-h-60 overflow-y-auto">
              {options.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                    value === opt.value ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="capitalize">{opt.label}</span>
                  {value === opt.value && <Check size={14} className="text-brand-500" />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
