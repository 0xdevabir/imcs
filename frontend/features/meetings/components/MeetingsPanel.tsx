'use client';

import React, { useState } from 'react';
import { avatarGradient } from '@/lib/avatar';

interface MeetingsPanelProps {
  darkMode: boolean;
}

interface Meeting {
  id: string;
  title: string;
  host: string;
  time: string;
  date: string;
  participants: string[];
  status: 'upcoming' | 'live' | 'ended';
  meetingId: string;
}

const MOCK_MEETINGS: Meeting[] = [
  {
    id: '1',
    title: 'Team Standup',
    host: 'ABIR',
    time: '09:00 AM',
    date: 'Today',
    participants: ['ABIR', 'RAYAT', 'ZION', 'MEHERAZ'],
    status: 'live',
    meetingId: 'sec-0192-kkp3',
  },
  {
    id: '2',
    title: 'Product Review — Q2',
    host: 'MEHERAZ',
    time: '02:00 PM',
    date: 'Today',
    participants: ['MEHERAZ', 'NISHAK', 'SAYED', 'RAKIB', 'ZAFOR'],
    status: 'upcoming',
    meetingId: 'sec-4471-pqr8',
  },
  {
    id: '3',
    title: 'Security Briefing',
    host: 'ABIR',
    time: '10:30 AM',
    date: 'Tomorrow',
    participants: ['ABIR', 'SHAFIN', 'ZOHIR'],
    status: 'upcoming',
    meetingId: 'sec-7732-xyz1',
  },
  {
    id: '4',
    title: 'Design Sync',
    host: 'RAYAT',
    time: '11:00 AM',
    date: 'Mar 28',
    participants: ['RAYAT', 'ZION', 'NISHAK'],
    status: 'upcoming',
    meetingId: 'sec-2245-abc5',
  },
  {
    id: '5',
    title: 'Sprint Planning',
    host: 'SAYED',
    time: '03:30 PM',
    date: 'Yesterday',
    participants: ['SAYED', 'RAKIB', 'ZAFOR', 'SHAFIN', 'ZOHIR', 'ABIR'],
    status: 'ended',
    meetingId: 'sec-8819-def9',
  },
];

export function MeetingsPanel({ darkMode }: MeetingsPanelProps) {
  const [showStartModal, setShowStartModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'live' | 'upcoming' | 'ended'>('all');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleStart = () => {
    if (!meetingTitle.trim()) return;
    showToast(`Meeting "${meetingTitle}" started! (UI demo)`);
    setMeetingTitle('');
    setShowStartModal(false);
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    showToast(`Joining meeting ${joinCode}... (UI demo)`);
    setJoinCode('');
    setShowJoinModal(false);
  };

  const filtered = activeFilter === 'all'
    ? MOCK_MEETINGS
    : MOCK_MEETINGS.filter(m => m.status === activeFilter);

  const liveMeetings = MOCK_MEETINGS.filter(m => m.status === 'live');
  const upcomingMeetings = MOCK_MEETINGS.filter(m => m.status === 'upcoming');

  return (
    <div className={`h-full flex flex-col overflow-hidden ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Header */}
      <div className={`flex-shrink-0 border-b px-4 pt-5 pb-4 ${
        darkMode ? 'border-white/5 bg-slate-900' : 'border-slate-200 bg-white'
      }`}>
        <div className="mb-4 space-y-3">
          <div>
            <h1 className={`text-xl font-bold tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              Meetings
            </h1>
            <p className={`text-sm mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              {liveMeetings.length > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {liveMeetings.length} live · {upcomingMeetings.length} upcoming
                </span>
              ) : (
                `${upcomingMeetings.length} upcoming`
              )}
            </p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setShowJoinModal(true); setShowStartModal(false); }}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                darkMode
                  ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Join
            </button>
            <button
              type="button"
              onClick={() => { setShowStartModal(true); setShowJoinModal(false); }}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap text-white bg-blue-600 hover:bg-blue-500 transition-all duration-150 active:scale-95 shadow-sm shadow-blue-500/25"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Start Meeting
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div
          className={`rounded-xl p-1 ${
            darkMode ? 'bg-slate-800/60' : 'bg-slate-100'
          }`}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '4px',
          }}
        >
          {(['all', 'live', 'upcoming', 'ended'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={`min-w-0 rounded-lg py-1.5 px-1 text-[11px] font-semibold capitalize transition-all duration-150 ${
                activeFilter === f
                  ? darkMode
                    ? 'bg-slate-700 text-slate-100 shadow-sm'
                    : 'bg-white text-slate-900 shadow-sm'
                  : darkMode
                    ? 'text-slate-500 hover:text-slate-300'
                    : 'text-slate-500 hover:text-slate-700'
              }`}
              style={{ whiteSpace: 'nowrap' }}
            >
              {f}
              {f === 'live' && liveMeetings.length > 0 && (
                <span className="ml-1 inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Start/Join modal inline banner */}
      {(showStartModal || showJoinModal) && (
        <div className={`flex-shrink-0 border-b px-4 py-4 ${
          darkMode ? 'border-white/5 bg-slate-900/80' : 'border-slate-200 bg-blue-50/60'
        }`}>
          {showStartModal && (
            <div className="space-y-3">
              <div>
                <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Meeting title
                </p>
                <input
                  autoFocus
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                  placeholder="e.g. Team Standup, Sprint Review..."
                  className={`w-full rounded-xl px-3 py-2 text-sm outline-none border transition-colors ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 focus:border-blue-500/60'
                      : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-400'
                  }`}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={!meetingTitle.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  Start
                </button>
                <button
                  type="button"
                  onClick={() => { setShowStartModal(false); setMeetingTitle(''); }}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {showJoinModal && (
            <div className="space-y-3">
              <div>
                <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Meeting ID or link
                </p>
                <input
                  autoFocus
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  placeholder="e.g. sec-0192-kkp3"
                  className={`w-full rounded-xl px-3 py-2 text-sm outline-none border font-mono transition-colors ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 focus:border-blue-500/60'
                      : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-400'
                  }`}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={!joinCode.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  Join
                </button>
                <button
                  type="button"
                  onClick={() => { setShowJoinModal(false); setJoinCode(''); }}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Meeting list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
              darkMode ? 'bg-slate-800' : 'bg-white shadow-sm'
            }`}>
              <svg className={`w-8 h-8 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className={`text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>No meetings</p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
              Start or schedule a new meeting
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Live meetings first */}
            {filtered.filter(m => m.status === 'live').length > 0 && (
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${darkMode ? 'text-emerald-500/70' : 'text-emerald-600/70'}`}>
                  Live Now
                </p>
                <div className="space-y-2">
                  {filtered.filter(m => m.status === 'live').map(m => (
                    <MeetingCard key={m.id} meeting={m} darkMode={darkMode} onToast={showToast} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {filtered.filter(m => m.status === 'upcoming').length > 0 && (
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-widest mb-2 mt-4 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                  Upcoming
                </p>
                <div className="space-y-2">
                  {filtered.filter(m => m.status === 'upcoming').map(m => (
                    <MeetingCard key={m.id} meeting={m} darkMode={darkMode} onToast={showToast} />
                  ))}
                </div>
              </div>
            )}

            {/* Ended */}
            {filtered.filter(m => m.status === 'ended').length > 0 && (
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-widest mb-2 mt-4 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                  Past Meetings
                </p>
                <div className="space-y-2">
                  {filtered.filter(m => m.status === 'ended').map(m => (
                    <MeetingCard key={m.id} meeting={m} darkMode={darkMode} onToast={showToast} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            darkMode ? 'bg-slate-700 text-slate-100' : 'bg-slate-900 text-white'
          }`}>
            <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function MeetingCard({
  meeting,
  darkMode,
  onToast,
}: {
  meeting: Meeting;
  darkMode: boolean;
  onToast: (msg: string) => void;
}) {
  const isLive = meeting.status === 'live';
  const isEnded = meeting.status === 'ended';
  const grad = avatarGradient(meeting.host);
  const maxAvatars = 4;
  const extraCount = meeting.participants.length - maxAvatars;

  return (
    <div className={`rounded-2xl border p-3.5 transition-all duration-150 ${
      isLive
        ? darkMode
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : 'border-emerald-200 bg-emerald-50/60'
        : isEnded
          ? darkMode
            ? 'border-white/5 bg-slate-800/30 opacity-70'
            : 'border-slate-200 bg-white/50 opacity-70'
          : darkMode
            ? 'border-white/5 bg-slate-900/80 hover:bg-slate-800/80'
            : 'border-slate-200 bg-white hover:bg-slate-50/80'
    }`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Meeting icon */}
          <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
            isLive
              ? 'bg-emerald-500/20'
              : isEnded
                ? darkMode ? 'bg-slate-700/60' : 'bg-slate-100'
                : darkMode ? 'bg-blue-500/15' : 'bg-blue-50'
          }`}>
            {isLive ? (
              <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className={`w-5 h-5 ${isEnded ? (darkMode ? 'text-slate-600' : 'text-slate-400') : (darkMode ? 'text-blue-400' : 'text-blue-600')}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-sm font-semibold truncate ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {meeting.title}
              </h3>
              {isLive && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            <div className={`flex items-center gap-x-3 gap-y-1 mt-1 text-xs flex-wrap ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {meeting.date} · {meeting.time}
              </span>
              <span className="flex items-center gap-1">
                <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-[8px] font-bold text-white`}>
                  {meeting.host.charAt(0)}
                </div>
                {meeting.host}
              </span>
            </div>

            {/* Participants */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <div className="flex items-center">
                {meeting.participants.slice(0, maxAvatars).map((p, i) => (
                  <div
                    key={p}
                    title={p}
                    className={`w-5 h-5 rounded-full bg-gradient-to-br ${avatarGradient(p)} flex items-center justify-center text-[8px] font-bold text-white ring-2 ${darkMode ? 'ring-slate-900' : 'ring-white'}`}
                    style={{ marginLeft: i > 0 ? '-6px' : '0', zIndex: meeting.participants.length - i }}
                  >
                    {p.charAt(0)}
                  </div>
                ))}
                {extraCount > 0 && (
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold -ml-1.5 ring-2 ${
                    darkMode ? 'bg-slate-700 text-slate-400 ring-slate-900' : 'bg-slate-200 text-slate-600 ring-white'
                  }`} style={{ marginLeft: '-6px' }}>
                    +{extraCount}
                  </div>
                )}
              </div>
              <span className={`text-[11px] ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Meeting ID */}
            <div className={`mt-2 flex items-center gap-1.5 font-mono text-[11px] break-all ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              {meeting.meetingId}
            </div>
          </div>
        </div>

        {/* Action button */}
        {!isEnded && (
          <button
            type="button"
            onClick={() => onToast(`${isLive ? 'Joining' : 'Starting'} "${meeting.title}"... (UI demo)`)}
            className={`self-start flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-95 ${
              isLive
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-sm shadow-emerald-500/25'
                : darkMode
                  ? 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              {isLive ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7m0 0l-7 7m7-7H3" />
              )}
            </svg>
            {isLive ? 'Join' : 'Open'}
          </button>
        )}
      </div>
    </div>
  );
}
