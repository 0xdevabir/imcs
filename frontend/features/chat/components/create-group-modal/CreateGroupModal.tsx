'use client';

import React, { KeyboardEvent, useRef, useState } from 'react';

interface CreateGroupModalProps {
  darkMode: boolean;
  onClose: () => void;
  onCreate: (data: { key: string; name: string; participantUsernames: string[] }) => void;
}

function slugify(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40);
}

export function CreateGroupModal({ darkMode, onClose, onCreate }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [keyEdited, setKeyEdited] = useState(false);
  const [chipInput, setChipInput] = useState('');
  const [chips, setChips] = useState<string[]>([]);
  const chipInputRef = useRef<HTMLInputElement>(null);

  const inputBase = `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all ${
    darkMode
      ? 'border-slate-700/80 bg-slate-950 text-slate-100 placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10'
      : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10'
  }`;

  const handleNameChange = (value: string) => {
    setName(value);
    if (!keyEdited) setKey(slugify(value));
  };

  const commitChip = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setChips((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setChipInput('');
  };

  const handleChipKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitChip(chipInput);
    } else if (e.key === 'Backspace' && !chipInput && chips.length > 0) {
      setChips((prev) => prev.slice(0, -1));
    }
  };

  const handleChipInputChange = (value: string) => {
    if (value.endsWith(',')) {
      commitChip(value.slice(0, -1));
    } else {
      setChipInput(value);
    }
  };

  const removeChip = (username: string) => setChips((prev) => prev.filter((c) => c !== username));

  const handleSubmit = () => {
    const finalKey = key.trim().toLowerCase();
    if (!finalKey) return;
    const pending = chipInput.trim();
    const finalChips = pending && !chips.includes(pending) ? [...chips, pending] : chips;
    onCreate({ key: finalKey, name: name.trim(), participantUsernames: finalChips });
  };

  const keyCount = key.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full max-w-md rounded-2xl border shadow-2xl scale-in ${
          darkMode ? 'border-slate-700/80 bg-slate-900' : 'border-slate-200 bg-white'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold">Create Group</h2>
              <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Set up a new group conversation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Display Name */}
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Group Name
            </label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Team Alpha"
              autoFocus
              className={inputBase}
            />
          </div>

          {/* Group Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Group Key <span className={darkMode ? 'text-slate-600' : 'text-slate-400'}>(unique ID)</span>
              </label>
              <span className={`text-[11px] tabular-nums ${keyCount > 36 ? 'text-amber-500' : darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                {keyCount}/40
              </span>
            </div>
            <input
              value={key}
              onChange={(e) => { setKey(e.target.value.slice(0, 40)); setKeyEdited(true); }}
              placeholder="auto-generated"
              className={inputBase}
            />
          </div>

          {/* Participants chip input */}
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Participants <span className={darkMode ? 'text-slate-600' : 'text-slate-400'}>(optional)</span>
            </label>
            <div
              onClick={() => chipInputRef.current?.focus()}
              className={`min-h-[42px] flex flex-wrap gap-1.5 rounded-xl border px-2.5 py-2 cursor-text transition-all ${
                darkMode
                  ? 'border-slate-700/80 bg-slate-950 focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/10'
                  : 'border-slate-200 bg-slate-50 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10'
              }`}
            >
              {chips.map((chip) => (
                <span
                  key={chip}
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${
                    darkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {chip}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeChip(chip); }}
                    className={`rounded-full p-0.5 transition-colors ${darkMode ? 'hover:bg-blue-500/30' : 'hover:bg-blue-200'}`}
                  >
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              <input
                ref={chipInputRef}
                value={chipInput}
                onChange={(e) => handleChipInputChange(e.target.value)}
                onKeyDown={handleChipKeyDown}
                onBlur={() => commitChip(chipInput)}
                placeholder={chips.length === 0 ? 'Type username, press Enter or comma...' : ''}
                className={`flex-1 min-w-[120px] bg-transparent text-sm outline-none ${
                  darkMode ? 'text-slate-100 placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>
            <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
              Press Enter or comma to add each person
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!key.trim()}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed px-3.5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}
