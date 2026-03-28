'use client';

import { CallHistoryItem } from '@/features/chat/types';

interface CallsPanelProps {
  callHistory: CallHistoryItem[];
  darkMode: boolean;
  onStartVoiceCall: (userId: number, username: string) => void;
  onStartVideoCall: (userId: number, username: string) => void;
}

const AVATAR_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-600',
  'from-fuchsia-500 to-violet-600',
];

function avatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function formatDuration(seconds: number) {
  if (seconds === 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function CallsPanel(props: CallsPanelProps) {
  const missed = props.callHistory.filter((c) => c.callStatus === 'missed');
  const recent = props.callHistory.filter((c) => c.callStatus !== 'missed');

  return (
    <section className={`h-full flex flex-col ${
      props.darkMode ? 'bg-[#111b21] text-[#e9edef]' : 'bg-white text-[#111b21]'
    }`}>
      {/* Header */}
      <div className={`px-4 pt-4 pb-3 border-b ${
        props.darkMode ? 'border-white/5 bg-[#202c33]' : 'border-slate-100 bg-[#f0f2f5]'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-xl font-bold tracking-tight ${props.darkMode ? 'text-[#e9edef]' : 'text-[#111b21]'}`}>
              Calls
            </h1>
            <p className={`text-xs mt-0.5 ${props.darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              {props.callHistory.length === 0 ? 'No recent calls' : (
                <span className="inline-flex items-center gap-2">
                  <span>{props.callHistory.length} total</span>
                  {missed.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-rose-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      {missed.length} missed
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Call list */}
      <div className="flex-1 overflow-y-auto">
        {props.callHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${
              props.darkMode ? 'bg-[#202c33]' : 'bg-slate-100'
            }`}>
              <svg className={`w-8 h-8 ${props.darkMode ? 'text-slate-600' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <p className={`text-sm font-semibold mb-1 ${props.darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              No call history
            </p>
            <p className={`text-xs leading-relaxed ${props.darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
              Start a call from Contacts or a chat window
            </p>
          </div>
        ) : (
          <div>
            {missed.length > 0 && (
              <div>
                <div className="px-5 pt-4 pb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${props.darkMode ? 'text-rose-500/60' : 'text-rose-500/70'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Missed · {missed.length}
                  </span>
                </div>
                {missed.map((call) => (
                  <CallItem
                    key={call.id}
                    call={call}
                    darkMode={props.darkMode}
                    onStartVoiceCall={props.onStartVoiceCall}
                    onStartVideoCall={props.onStartVideoCall}
                  />
                ))}
              </div>
            )}

            {recent.length > 0 && (
              <div>
                <div className="px-5 pt-4 pb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${props.darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${props.darkMode ? 'bg-slate-600' : 'bg-slate-300'}`} />
                    Recent · {recent.length}
                  </span>
                </div>
                {recent.map((call) => (
                  <CallItem
                    key={call.id}
                    call={call}
                    darkMode={props.darkMode}
                    onStartVoiceCall={props.onStartVoiceCall}
                    onStartVideoCall={props.onStartVideoCall}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function CallItem({
  call, darkMode, onStartVoiceCall, onStartVideoCall,
}: {
  call: CallHistoryItem;
  darkMode: boolean;
  onStartVoiceCall: (userId: number, username: string) => void;
  onStartVideoCall: (userId: number, username: string) => void;
}) {
  const grad = avatarGradient(call.peerUsername);
  const duration = formatDuration(call.duration);
  const isMissed = call.callStatus === 'missed';
  const isIncoming = call.callStatus === 'incoming' || call.callStatus === 'completed';

  // Arrow direction indicator
  const ArrowIcon = () => {
    if (isMissed) {
      return (
        <svg className="w-3 h-3 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
        </svg>
      );
    }
    if (isIncoming) {
      return (
        <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11l-7-7-7 7" />
        </svg>
      );
    }
    return (
      <svg className={`w-3 h-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 11l7-7 7 7" />
      </svg>
    );
  };

  const statusLabel = isMissed ? 'Missed' : isIncoming ? 'Incoming' : 'Outgoing';
  const statusColor = isMissed
    ? 'text-rose-500'
    : isIncoming
      ? darkMode ? 'text-emerald-400' : 'text-emerald-600'
      : darkMode ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className={`group flex items-center gap-3 px-4 py-3 transition-colors duration-100 ${
      darkMode ? 'hover:bg-[#202c33]' : 'hover:bg-slate-50'
    }`}>
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-sm font-bold text-white shadow-sm`}>
          {call.peerUsername.charAt(0).toUpperCase()}
        </div>
        {/* Call type badge */}
        <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-2 ${
          darkMode ? 'ring-[#111b21]' : 'ring-white'
        } ${call.callType === 'video' ? 'bg-blue-500' : isMissed ? 'bg-rose-500' : 'bg-emerald-500'}`}>
          {call.callType === 'video' ? (
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
          {call.peerUsername}
        </p>
        <div className={`flex items-center gap-1.5 text-xs mt-0.5 ${statusColor}`}>
          <ArrowIcon />
          <span>{statusLabel}</span>
          {duration && (
            <span className={`${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>· {duration}</span>
          )}
        </div>
      </div>

      {/* Time + redial */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className={`text-xs tabular-nums group-hover:hidden ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
          {formatTime(call.createdAt)}
        </span>
        <div className="hidden group-hover:flex items-center gap-1">
          <button
            type="button"
            onClick={() => onStartVoiceCall(call.peerUserId, call.peerUsername)}
            title="Voice call back"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              darkMode ? 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onStartVideoCall(call.peerUserId, call.peerUsername)}
            title="Video call back"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              darkMode ? 'text-slate-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
