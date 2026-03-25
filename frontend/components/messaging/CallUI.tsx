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
  if (!props.visible) {
    return null;
  }

  const isVideo = props.callType === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
      
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col">
        <div className="flex items-center justify-between p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">
                {isVideo ? 'Video Call' : 'Voice Call'}
              </p>
              <p className="text-white/60 text-xs">{props.callDurationLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/80 text-xs">{props.callStatus}</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl grid gap-3" style={{ 
            gridTemplateColumns: isVideo ? 'repeat(2, 1fr)' : '1fr',
            minHeight: isVideo ? '300px' : '200px'
          }}>
            {isVideo ? (
              <>
                <div className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                  props.activeSpeaker === 'local' ? 'border-blue-500 shadow-lg shadow-blue-500/30' : 'border-white/20'
                }`}>
                  <video 
                    ref={props.localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className={`w-full aspect-video object-cover ${props.isCameraOff ? 'hidden' : ''}`} 
                  />
                  {props.isCameraOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                      <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center">
                        <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
                    You {props.isMuted && '🔇'}
                  </div>
                </div>
                
                <div className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                  props.activeSpeaker === 'remote' ? 'border-blue-500 shadow-lg shadow-blue-500/30' : 'border-white/20'
                }`}>
                  {props.activeCallUserId || props.incomingCall ? (
                    <>
                      <video 
                        ref={props.remoteVideoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full aspect-video object-cover" 
                      />
                      <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
                        {props.incomingCall?.fromUsername || 'Participant'}
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/80">
                      <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center mb-3">
                        <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <p className="text-white/60 text-sm">Waiting for participant...</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border-2 border-white/20">
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 p-8">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                    <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <p className="text-white font-medium text-lg">{props.incomingCall?.fromUsername || 'Participant'}</p>
                  <p className="text-white/60 text-sm mt-1">{props.callStatus}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {props.incomingCall && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
            <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700 p-6 max-w-sm w-full shadow-2xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                  {props.incomingCall.fromUsername.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium">{props.incomingCall.fromUsername}</p>
                  <p className="text-white/60 text-sm">Incoming {props.incomingCall.callType} call</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={props.onAcceptCall}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-medium py-3 px-4 transition-all active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Accept
                </button>
                <button 
                  type="button" 
                  onClick={props.onRejectCall}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-400 hover:to-red-400 text-white font-medium py-3 px-4 transition-all active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                  </svg>
                  Decline
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 md:gap-4 p-4 md:p-6">
          <ControlButton 
            active={props.isMuted} 
            icon={
              props.isMuted ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
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
              icon={
                props.isCameraOff ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
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
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
            label={props.isScreenSharing ? 'Stop Share' : 'Share Screen'} 
            onClick={props.onToggleScreenShare} 
          />
          
          <ControlButton 
            active={props.participantsOpen} 
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
            label="Participants" 
            onClick={props.onToggleParticipants} 
          />
          
          <button 
            type="button" 
            onClick={props.onEndCall} 
            className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-400 hover:to-red-400 text-white font-medium px-6 py-3 transition-all active:scale-95 shadow-lg shadow-rose-500/30"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
            <span className="hidden md:inline">End Call</span>
          </button>
        </div>

        {props.participantsOpen && (
          <div className="absolute right-4 top-20 w-64 bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700 p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-semibold text-sm">Participants</p>
              <span className="text-white/60 text-xs">{props.participants.length + 1}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-semibold">
                  You
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm">You</p>
                  <p className="text-white/50 text-xs">{props.isMuted ? 'Muted' : 'Speaking'}</p>
                </div>
              </div>
              {props.participants.map((person) => (
                <div key={person.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-semibold">
                    {person.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm">{person.username}</p>
                    <p className="text-white/50 text-xs">Connected</p>
                  </div>
                </div>
              ))}
              {props.participants.length === 0 && (
                <p className="text-white/50 text-xs text-center py-2">No other participants</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ControlButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function ControlButton(props: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 active:scale-95 ${
        props.active 
          ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25' 
          : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
      }`}
    >
      {props.icon}
      <span className="hidden lg:inline">{props.label}</span>
    </button>
  );
}