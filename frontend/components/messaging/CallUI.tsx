import { RefObject } from 'react';
import { IncomingCall, OnlineUser } from './types';

type CallUIProps = {
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
  onAcceptCall: () => void;
  onRejectCall: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleParticipants: () => void;
  onEndCall: () => void;
};

export function CallUI(props: CallUIProps) {
  if (!props.visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.18),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(20,184,166,0.15),transparent_30%),#020617] text-white">
      <div className="absolute inset-0 grid grid-cols-1 gap-2 p-2 md:grid-cols-2 md:p-4">
        <div className={`relative overflow-hidden rounded-3xl border ${props.activeSpeaker === 'local' ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-slate-700'} shadow-[0_18px_40px_rgba(2,6,23,0.45)]`}>
          <video ref={props.localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-xs">You</div>
        </div>
        <div className={`relative overflow-hidden rounded-3xl border ${props.activeSpeaker === 'remote' ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-slate-700'} shadow-[0_18px_40px_rgba(2,6,23,0.45)]`}>
          <video ref={props.remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
          <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-xs">Participant</div>
        </div>
      </div>

      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs backdrop-blur-md">
        <span>{props.callType === 'video' ? 'Video Call' : 'Voice Call'}</span>
        <span>•</span>
        <span>{props.callDurationLabel}</span>
        <span>•</span>
        <span>{props.callStatus}</span>
      </div>

      {props.incomingCall ? (
        <div className="absolute left-1/2 top-16 w-[90%] max-w-md -translate-x-1/2 rounded-2xl border border-slate-700 bg-slate-900/90 p-4 shadow-[0_20px_46px_rgba(2,6,23,0.45)] backdrop-blur-md">
          <p className="text-sm">Incoming {props.incomingCall.callType} call from {props.incomingCall.fromUsername}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={props.onAcceptCall} className="btn-press flex-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 px-3 py-2 text-sm font-semibold hover:from-emerald-500 hover:to-teal-400">
              Accept
            </button>
            <button type="button" onClick={props.onRejectCall} className="btn-press flex-1 rounded-lg bg-gradient-to-r from-rose-600 to-red-500 px-3 py-2 text-sm font-semibold hover:from-rose-500 hover:to-red-400">
              Reject
            </button>
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/65 px-3 py-2 backdrop-blur-md">
        <ControlButton active={props.isMuted} label={props.isMuted ? 'Unmute' : 'Mute'} onClick={props.onToggleMute} />
        <ControlButton active={props.isCameraOff} label={props.isCameraOff ? 'Cam On' : 'Cam Off'} onClick={props.onToggleCamera} />
        <ControlButton active={props.isScreenSharing} label={props.isScreenSharing ? 'Stop Share' : 'Share'} onClick={props.onToggleScreenShare} />
        <ControlButton active={props.participantsOpen} label="Participants" onClick={props.onToggleParticipants} />
        <button type="button" onClick={props.onEndCall} className="btn-press rounded-full bg-gradient-to-r from-rose-600 to-red-500 px-4 py-2 text-sm font-semibold hover:from-rose-500 hover:to-red-400">
          End
        </button>
      </div>

      {props.participantsOpen ? (
        <aside className="absolute right-4 top-16 w-64 rounded-2xl border border-slate-700 bg-slate-900/95 p-3 shadow-[0_20px_46px_rgba(2,6,23,0.45)] backdrop-blur-md">
          <p className="mb-2 text-sm font-semibold">Participants</p>
          <div className="space-y-1">
            {props.participants.length === 0 ? <p className="text-xs text-slate-400">No participants listed</p> : null}
            {props.participants.map((person) => (
              <p key={person.userId} className="rounded-lg bg-slate-800 px-2 py-1 text-xs">
                {person.username}
              </p>
            ))}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

type ControlButtonProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

function ControlButton(props: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`btn-press rounded-full px-3 py-2 text-xs font-semibold transition ${
        props.active ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white' : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
      }`}
    >
      {props.label}
    </button>
  );
}
