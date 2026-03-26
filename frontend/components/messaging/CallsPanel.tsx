'use client';

import { CallHistoryItem } from './types';

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
  const completed = props.callHistory.filter((c) => c.callStatus === 'completed' || c.callStatus === 'incoming' || c.callStatus === 'outgoing');

  return (
    <section
      className={`h-full flex flex-col transition-all duration-300 ${
        props.darkMode
          ? 'bg-slate-950/90 text-slate-200'
          : 'bg-slate-50/80 text-slate-800'
      }`}
    >
      {/* Header */}
      <div className={`px-5 pt-6 pb-5 border-b ${props.darkMode ? 'border-slate-800/60' : 'border-slate-200/80'}`}>
        <h1 className="text-xl font-bold tracking-tight">Calls</h1>
        <div className="flex items-center gap-3 mt-2">
          <div className={`inline-flex items-center gap-1.5 text-sm ${props.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            {props.callHistory.length} total
          </div>
          {missed.length > 0 && (
            <div className="inline-flex items-center gap-1.5 text-sm text-rose-500">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {missed.length} missed
            </div>
          )}
        </div>
      </div>

      {/* Call list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {props.callHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${
              props.darkMode ? 'bg-slate-800/60' : 'bg-white shadow-sm'
            }`}>
              <svg className={`w-8 h-8 ${props.darkMode ? 'text-slate-600' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <p className={`text-sm font-semibold mb-1.5 ${props.darkMode ? 'text-slate-400' : 'text-slate-600'}`}>No call history</p>
            <p className={`text-xs ${props.darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
              Start a call from Contacts or a chat
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {missed.length > 0 && (
              <CallSection
                title="Missed"
                calls={missed}
                accentColor="rose"
                darkMode={props.darkMode}
                onStartVoiceCall={props.onStartVoiceCall}
                onStartVideoCall={props.onStartVideoCall}
              />
            )}
            {completed.length > 0 && (
              <CallSection
                title="Recent"
                calls={completed}
                accentColor="slate"
                darkMode={props.darkMode}
                onStartVoiceCall={props.onStartVoiceCall}
                onStartVideoCall={props.onStartVideoCall}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function CallSection({
  title, calls, accentColor, darkMode, onStartVoiceCall, onStartVideoCall,
}: {
  title: string;
  calls: CallHistoryItem[];
  accentColor: string;
  darkMode: boolean;
  onStartVoiceCall: (userId: number, username: string) => void;
  onStartVideoCall: (userId: number, username: string) => void;
}) {
  const dotColors: Record<string, string> = {
    rose: 'bg-rose-500',
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    slate: darkMode ? 'bg-slate-600' : 'bg-slate-300',
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[accentColor] ?? dotColors.slate}`} />
        <p className={`text-[11px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {title}
        </p>
        <span className={`text-[10px] font-medium rounded-full px-1.5 py-0.5 ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
          {calls.length}
        </span>
      </div>
      <div className="space-y-1">
        {calls.map((call) => (
          <CallItem
            key={call.id}
            call={call}
            darkMode={darkMode}
            onStartVoiceCall={onStartVoiceCall}
            onStartVideoCall={onStartVideoCall}
          />
        ))}
      </div>
    </div>
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

  const statusConfig = {
    missed: { label: 'Missed call', color: 'text-rose-500', icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
      </svg>
    )},
    incoming: { label: 'Incoming', color: 'text-emerald-500', icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    )},
    outgoing: { label: 'Outgoing', color: darkMode ? 'text-slate-400' : 'text-slate-500', icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    )},
    completed: { label: 'Completed', color: darkMode ? 'text-slate-400' : 'text-slate-500', icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    )},
  };

  const { label, color, icon } = statusConfig[call.callStatus] ?? statusConfig.completed;

  return (
    <div
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 ${
        darkMode ? 'hover:bg-slate-800/60' : 'hover:bg-white hover:shadow-sm'
      }`}
    >
      {/* Avatar with call type badge */}
      <div className="relative flex-shrink-0">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-sm font-bold text-white shadow-sm`}>
          {call.peerUsername.charAt(0).toUpperCase()}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
          call.callType === 'video'
            ? 'bg-blue-500'
            : call.callStatus === 'missed'
              ? 'bg-rose-500'
              : 'bg-emerald-500'
        }`}>
          {call.callType === 'video' ? (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{call.peerUsername}</p>
        <div className={`flex items-center gap-1 text-xs ${color}`}>
          {icon}
          <span>{label}</span>
          {duration && (
            <span className={darkMode ? 'text-slate-600' : 'text-slate-400'}>· {duration}</span>
          )}
        </div>
      </div>

      {/* Time + redial */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs ${darkMode ? 'text-slate-600' : 'text-slate-400'} group-hover:hidden`}>
          {formatTime(call.createdAt)}
        </span>
        <div className="hidden group-hover:flex items-center gap-1">
          <button
            type="button"
            onClick={() => onStartVoiceCall(call.peerUserId, call.peerUsername)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-emerald-400' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
            }`}
            title="Voice call"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onStartVideoCall(call.peerUserId, call.peerUsername)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-blue-400' : 'text-slate-400 hover:bg-blue-50 hover:text-blue-600'
            }`}
            title="Video call"
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
