import { RefObject } from 'react';
import { IncomingCall, OnlineUser } from './types';

interface CallUIProps {
  visible: boolean;
  callType: 'voice' | 'video';
  callStatus: string;
  incomingCall: IncomingCall | null;
  callDurationLabel: string;
  localVideoRef: RefObject<HTMLVideoElement>;
  remoteVideoRef: RefObject<HTMLVideoElement>;
  participantsOpen: boolean;
  participants: OnlineUser[];
  activeSpeaker: 'local' | 'remote';
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  activeCallUserId: number | null;
  onAcceptCall: () => void;
  onRejectCall: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleParticipants: () => void;
  onEndCall: () => void;
}

export function CallUI(props: CallUIProps) {
  if (!props.visible) return null;

  const isVideo = props.callType === 'video';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1a2e]">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/8 backdrop-blur-sm">
            {isVideo ? (
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            )}
            <span className="text-white/90 text-sm font-medium">
              {isVideo ? 'Video Call' : 'Voice Call'}
            </span>
          </div>
          {props.callDurationLabel && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/8">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/70 text-sm font-mono">{props.callDurationLabel}</span>
            </div>
          )}
        </div>
        <div className="px-3 py-2 rounded-xl bg-white/8 backdrop-blur-sm">
          <span className="text-white/60 text-xs">{props.callStatus}</span>
        </div>
      </div>

      {/* Video area */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4">
        {isVideo ? (
          <div className="w-full max-w-5xl grid grid-cols-2 gap-4 h-full max-h-[70vh]">
            {/* Local video */}
            <div className={`relative rounded-2xl overflow-hidden bg-slate-800 ring-2 transition-all duration-300 ${
              props.activeSpeaker === 'local' ? 'ring-blue-500 shadow-xl shadow-blue-500/20' : 'ring-white/10'
            }`}>
              <video
                ref={props.localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${props.isCameraOff ? 'hidden' : ''}`}
              />
              {props.isCameraOff && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center mb-3">
                    <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="text-white/50 text-sm">Camera off</p>
                </div>
              )}
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <div className="px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1.5">
                  {props.isMuted && (
                    <svg className="w-3 h-3 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  )}
                  You
                </div>
                {props.isScreenSharing && (
                  <div className="px-2 py-1 rounded-lg bg-blue-600/80 backdrop-blur-sm text-white text-xs font-medium">
                    Sharing screen
                  </div>
                )}
              </div>
            </div>

            {/* Remote video */}
            <div className={`relative rounded-2xl overflow-hidden bg-slate-800 ring-2 transition-all duration-300 ${
              props.activeSpeaker === 'remote' ? 'ring-blue-500 shadow-xl shadow-blue-500/20' : 'ring-white/10'
            }`}>
              {props.activeCallUserId || props.incomingCall ? (
                <>
                  <video ref={props.remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
                    {props.incomingCall?.fromUsername || 'Participant'}
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center mb-3">
                    <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="text-white/50 text-sm">Waiting for participant...</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Voice call - centered avatar */
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-8">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-4xl font-bold text-white shadow-2xl shadow-blue-500/30">
                {(props.incomingCall?.fromUsername || 'P').charAt(0).toUpperCase()}
              </div>
              {!props.isMuted && (
                <span className="absolute inset-0 rounded-full ring-4 ring-blue-400/30 animate-ping" />
              )}
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">
              {props.incomingCall?.fromUsername || 'Participant'}
            </h2>
            <p className="text-white/50 text-base">{props.callStatus}</p>
          </div>
        )}
      </div>

      {/* Incoming call overlay */}
      {props.incomingCall && !props.activeCallUserId && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-white/10 p-7 max-w-sm w-full shadow-2xl text-center">
            {/* Animated ring */}
            <div className="relative inline-block mb-5">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white mx-auto shadow-xl shadow-blue-500/30">
                {props.incomingCall.fromUsername.charAt(0).toUpperCase()}
              </div>
              <span className="absolute inset-0 rounded-full ring-4 ring-blue-400/40 animate-ping" />
            </div>
            <h3 className="text-white text-xl font-bold mb-1">{props.incomingCall.fromUsername}</h3>
            <p className="text-white/50 text-sm mb-7">
              Incoming {props.incomingCall.callType === 'video' ? 'video' : 'voice'} call
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={props.onRejectCall}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-semibold py-4 transition-all active:scale-95 ring-1 ring-rose-500/30"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Decline
              </button>
              <button
                type="button"
                onClick={props.onAcceptCall}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-4 transition-all active:scale-95 shadow-lg shadow-emerald-500/30"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control bar */}
      <div className="relative z-10 pb-8 px-4">
        <div className="mx-auto w-full max-w-2xl">
          <div className="flex items-center justify-center gap-3 md:gap-4 bg-white/8 backdrop-blur-xl rounded-2xl px-5 py-4 ring-1 ring-white/10">
            {/* Controls left */}
            <div className="flex items-center gap-2 md:gap-3 flex-1 justify-end">
              <ControlButton
                active={props.isMuted}
                activeColor="rose"
                icon={
                  props.isMuted ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )
                }
                label={props.isMuted ? 'Unmute' : 'Mute'}
                onClick={props.onToggleMute}
              />

              {isVideo && (
                <ControlButton
                  active={props.isCameraOff}
                  activeColor="rose"
                  icon={
                    props.isCameraOff ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )
                  }
                  label={props.isCameraOff ? 'Start Video' : 'Stop Video'}
                  onClick={props.onToggleCamera}
                />
              )}

              <ControlButton
                active={props.isScreenSharing}
                activeColor="blue"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
                label={props.isScreenSharing ? 'Stop Share' : 'Share'}
                onClick={props.onToggleScreenShare}
              />

              <ControlButton
                active={props.participantsOpen}
                activeColor="blue"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
                label="People"
                onClick={props.onToggleParticipants}
              />
            </div>

            {/* Divider */}
            <div className="w-px h-10 bg-white/10" />

            {/* End call */}
            <button
              type="button"
              onClick={props.onEndCall}
              className="flex items-center justify-center gap-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-semibold px-5 py-3 transition-all active:scale-95 shadow-lg shadow-rose-500/25 flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
              <span className="hidden sm:inline">End Call</span>
            </button>
          </div>
        </div>
      </div>

      {/* Participants panel */}
      {props.participantsOpen && (
        <div className="absolute right-4 top-20 z-20 w-60 bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-white/10 p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-semibold text-sm">In this call</p>
            <span className="text-white/40 text-xs bg-white/10 px-2 py-0.5 rounded-full">{props.participants.length + 1}</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-white/8">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                Y
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">You</p>
                <p className="text-white/40 text-xs">{props.isMuted ? 'Muted' : 'Active'}</p>
              </div>
              {props.isMuted && (
                <svg className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </div>
            {props.participants.map((person) => (
              <div key={person.userId} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/8 transition-colors">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold">
                  {person.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{person.username}</p>
                  <p className="text-white/40 text-xs">Connected</p>
                </div>
              </div>
            ))}
            {props.participants.length === 0 && (
              <p className="text-white/30 text-xs text-center py-3">No other participants</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ControlButtonProps {
  active: boolean;
  activeColor: 'rose' | 'blue';
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function ControlButton({ active, activeColor, icon, label, onClick }: ControlButtonProps) {
  const activeClasses = activeColor === 'rose'
    ? 'bg-rose-500/25 text-rose-400 ring-1 ring-rose-500/30'
    : 'bg-blue-500/25 text-blue-400 ring-1 ring-blue-500/30';

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 active:scale-95 min-w-[56px] ${
        active ? activeClasses : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      {icon}
      <span className="hidden md:block text-[10px]">{label}</span>
    </button>
  );
}
