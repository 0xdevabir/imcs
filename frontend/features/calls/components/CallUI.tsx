'use client';

import { MutableRefObject, useEffect, useRef } from 'react';
import { CallPeer, IncomingCall } from '@/features/chat/types';

interface CallUIProps {
  visible: boolean;
  callType: 'voice' | 'video';
  callStatus: string;
  incomingCall: IncomingCall | null;
  callDurationLabel: string;
  localVideoRef: MutableRefObject<HTMLVideoElement | null>;
  localStream: MediaStream | null;
  callPeers: CallPeer[];
  participantsOpen: boolean;
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
}

// ─── VideoTile ─────────────────────────────────────────────────────────────────
interface VideoTileProps {
  stream: MediaStream | null;
  label: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isScreenSharing?: boolean;
  isActive?: boolean;
  className?: string;
}

function VideoTile({ stream, label, isLocal, isMuted, isCameraOff, isScreenSharing, isActive, className = '' }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current || !stream) return;
    if (videoRef.current.srcObject !== stream) videoRef.current.srcObject = stream;
    videoRef.current.play().catch(() => undefined);
  }, [stream]);

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-slate-900 ring-2 ${isActive ? 'ring-blue-500 shadow-lg shadow-blue-500/20' : 'ring-white/10'} ${className}`}>
      {!isCameraOff && stream && (
        <video ref={videoRef} autoPlay playsInline muted={isLocal} className="w-full h-full object-cover" />
      )}
      {(isCameraOff || !stream) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-lg sm:text-xl font-bold text-white mb-2">
            {label.charAt(0).toUpperCase()}
          </div>
          {!stream && <p className="text-white/40 text-xs">Connecting…</p>}
          {stream && isCameraOff && <p className="text-white/40 text-xs">Camera off</p>}
        </div>
      )}
      <div className="absolute bottom-2 left-2.5 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
        {isMuted && (
          <svg className="w-3 h-3 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        )}
        <span className="text-white text-[10px] sm:text-xs font-medium leading-none">
          {label}{isScreenSharing && <span className="text-blue-400 ml-1">· Sharing</span>}
        </span>
      </div>
    </div>
  );
}

// ─── VideoGrid ─────────────────────────────────────────────────────────────────
interface VideoGridProps {
  localStream: MediaStream | null;
  localVideoRef: MutableRefObject<HTMLVideoElement | null>;
  callPeers: CallPeer[];
  callType: 'voice' | 'video';
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
}

function VideoGrid({ localStream, localVideoRef, callPeers, callType, isMuted, isCameraOff, isScreenSharing }: VideoGridProps) {
  const bindLocalVideo = (node: HTMLVideoElement | null) => {
    localVideoRef.current = node;
    if (!node || !localStream) return;
    if (node.srcObject !== localStream) node.srcObject = localStream;
    node.play().catch(() => undefined);
  };

  // Keep the local video ref in sync (used by page.tsx toggleScreenShare)
  useEffect(() => {
    if (!localVideoRef.current || !localStream) return;
    if (localVideoRef.current.srcObject !== localStream) localVideoRef.current.srcObject = localStream;
    localVideoRef.current.play().catch(() => undefined);
  }, [localStream, localVideoRef]);

  if (callType === 'voice') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 px-4">
        <div className="flex flex-wrap justify-center gap-5">
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-2xl shadow-blue-500/30">
              Y
              {!isMuted && <span className="absolute inset-0 rounded-full ring-4 ring-blue-400/30 animate-ping" />}
            </div>
            <span className="text-white/70 text-xs">You</span>
          </div>
          {callPeers.map(peer => (
            <div key={peer.userId} className="flex flex-col items-center gap-2">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-2xl">
                {peer.username.charAt(0).toUpperCase()}
                {peer.stream && <span className="absolute inset-0 rounded-full ring-4 ring-violet-400/30 animate-ping" />}
              </div>
              <span className="text-white/70 text-xs">{peer.username}</span>
            </div>
          ))}
        </div>
        {callPeers.length === 0 && (
          <p className="text-white/40 text-sm">Waiting for participants…</p>
        )}
      </div>
    );
  }

  const totalPeers = callPeers.length;

  // ── 0 remote peers: full-screen local (waiting state) ──────────────────────
  if (totalPeers === 0) {
    return (
      <div className="relative h-full w-full bg-slate-900 flex items-center justify-center">
        {localStream && !isCameraOff ? (
          <video ref={bindLocalVideo} autoPlay playsInline muted className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-white/40 text-sm">Waiting for participants…</p>
          </div>
        )}
        <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-white/70 text-xs">You</div>
      </div>
    );
  }

  // ── 1 remote peer: PiP on mobile, side-by-side on desktop ─────────────────
  if (totalPeers === 1) {
    const remotePeer = callPeers[0];
    return (
      <div className="relative h-full w-full md:flex md:gap-4 md:p-4 md:items-stretch">
        {/* Local — PiP bottom-right on mobile, left column on desktop */}
        <div className="absolute bottom-28 right-3 w-28 h-20 z-10 rounded-xl overflow-hidden shadow-2xl ring-2 ring-white/20 bg-slate-900 md:relative md:bottom-auto md:right-auto md:z-auto md:flex-1 md:min-h-0 md:w-auto md:h-auto md:rounded-2xl md:shadow-none md:ring-white/10">
          {localStream && !isCameraOff
            ? <video ref={bindLocalVideo} autoPlay playsInline muted className="w-full h-full object-cover" />
            : <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs md:text-sm font-bold">Y</div>
              </div>
          }
          <div className="absolute bottom-1 left-1.5 md:bottom-3 md:left-3 flex items-center gap-1 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md md:rounded-lg bg-black/50 backdrop-blur-sm text-white text-[9px] md:text-xs font-medium">
            {isMuted && <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>}
            You{isScreenSharing && <span className="hidden md:inline ml-1 text-blue-400">· Sharing</span>}
          </div>
        </div>

        {/* Remote — fills screen on mobile, right column on desktop */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-slate-900 md:relative md:inset-auto md:z-auto md:flex-1 md:min-h-0 md:rounded-2xl md:overflow-hidden md:ring-2 md:ring-white/10">
          {remotePeer.stream
            ? <video
                ref={(el) => { if (el && remotePeer.stream && el.srcObject !== remotePeer.stream) { el.srcObject = remotePeer.stream; el.play().catch(() => undefined); } }}
                autoPlay playsInline
                className="w-full h-full object-cover"
              />
            : <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white mb-3">{remotePeer.username.charAt(0).toUpperCase()}</div>
                <p className="text-white/40 text-sm">Connecting…</p>
              </div>
          }
          <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-medium">{remotePeer.username}</div>
        </div>
      </div>
    );
  }

  // ── 2–5 remote peers: dynamic grid ────────────────────────────────────────
  const totalTiles = totalPeers + 1; // +1 for self
  const gridClass = totalTiles <= 4 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className={`h-full w-full grid ${gridClass} gap-2 p-2 sm:p-3 content-start`}>
      {/* Local tile */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-900 ring-2 ring-white/10 aspect-video">
        {localStream && !isCameraOff
          ? <video ref={bindLocalVideo} autoPlay playsInline muted className="w-full h-full object-cover" />
          : <div className="absolute inset-0 flex items-center justify-center"><div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">Y</div></div>
        }
        <div className="absolute bottom-1.5 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/50 text-white text-[10px] font-medium">
          {isMuted && <svg className="w-2.5 h-2.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>}
          You
        </div>
      </div>

      {/* Remote tiles */}
      {callPeers.map(peer => (
        <VideoTile key={peer.userId} stream={peer.stream} label={peer.username} className="aspect-video" />
      ))}
    </div>
  );
}

// ─── CallUI ────────────────────────────────────────────────────────────────────
export function CallUI(props: CallUIProps) {
  if (!props.visible) return null;

  const isVideo = props.callType === 'video';
  const callerName = props.incomingCall?.fromUsername ?? (props.callPeers[0]?.username ?? 'Participants');
  const isGroupCall = props.incomingCall?.isGroupCall || props.callPeers.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0f1117]">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 shrink-0 flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/8 backdrop-blur-sm">
            {isVideo
              ? <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              : <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            }
            <span className="text-white/90 text-sm font-medium">
              {isVideo ? 'Video Call' : 'Voice Call'}
              {isGroupCall && <span className="ml-1 text-white/50">· Group</span>}
            </span>
          </div>
          {props.callDurationLabel !== '00:00' && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/8">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/70 text-sm font-mono">{props.callDurationLabel}</span>
            </div>
          )}
        </div>
        <div className="px-3 py-2 rounded-xl bg-white/8 backdrop-blur-sm">
          <span className="text-white/60 text-xs truncate max-w-[120px] sm:max-w-none block">{props.callStatus}</span>
        </div>
      </div>

      {/* Video / Audio area */}
      <div className="relative z-10 flex-1 min-h-0">
        <VideoGrid
          localStream={props.localStream}
          localVideoRef={props.localVideoRef}
          callPeers={props.callPeers}
          callType={props.callType}
          isMuted={props.isMuted}
          isCameraOff={props.isCameraOff}
          isScreenSharing={props.isScreenSharing}
        />
      </div>

      {/* Incoming call overlay */}
      {props.incomingCall && (
        <div className="absolute inset-0 z-30 flex items-end sm:items-center justify-center p-4 pb-6 sm:pb-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 sm:p-7 w-full max-w-sm shadow-2xl text-center">
            <div className="relative inline-block mb-4 sm:mb-5">
              <div className="w-[4.5rem] h-[4.5rem] rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white mx-auto shadow-xl shadow-blue-500/30">
                {props.incomingCall.isGroupCall
                  ? <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  : props.incomingCall.fromUsername.charAt(0).toUpperCase()
                }
              </div>
              <span className="absolute inset-0 rounded-full ring-4 ring-blue-400/40 animate-ping" />
            </div>
            <h3 className="text-white text-lg sm:text-xl font-bold mb-1">{props.incomingCall.fromUsername}</h3>
            <p className="text-white/50 text-sm mb-6 sm:mb-7">
              Incoming {props.incomingCall.isGroupCall ? 'group ' : ''}{props.incomingCall.callType === 'video' ? 'video' : 'voice'} call
            </p>
            <div className="flex gap-3 sm:gap-4">
              <button type="button" onClick={props.onRejectCall}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-semibold py-4 transition-all active:scale-95 ring-1 ring-rose-500/30 min-h-[56px]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                Decline
              </button>
              <button type="button" onClick={props.onAcceptCall}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-4 transition-all active:scale-95 shadow-lg shadow-emerald-500/30 min-h-[56px]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                {props.incomingCall.isGroupCall ? 'Join' : 'Accept'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control bar */}
      <div className="relative z-10 shrink-0 px-3 pb-5 pt-2 sm:px-4 sm:pb-8">
        <div className="mx-auto w-full max-w-lg">
          <div className="flex items-center justify-between gap-1.5 sm:gap-3 bg-white/8 backdrop-blur-xl rounded-2xl px-3 py-3 sm:px-5 sm:py-4 ring-1 ring-white/10">
            <ControlButton active={props.isMuted} activeColor="rose"
              icon={props.isMuted
                ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              }
              label={props.isMuted ? 'Unmute' : 'Mute'} onClick={props.onToggleMute} />

            {isVideo && (
              <ControlButton active={props.isCameraOff} activeColor="rose"
                icon={props.isCameraOff
                  ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" /></svg>
                  : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                }
                label={props.isCameraOff ? 'Start Video' : 'Stop Video'} onClick={props.onToggleCamera} />
            )}

            <ControlButton active={props.isScreenSharing} activeColor="blue"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
              label={props.isScreenSharing ? 'Stop Share' : 'Share'} onClick={props.onToggleScreenShare} />

            <ControlButton active={props.participantsOpen} activeColor="blue"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
              label={`People${props.callPeers.length > 0 ? ` (${props.callPeers.length + 1})` : ''}`}
              onClick={props.onToggleParticipants} />

            <div className="w-px h-8 bg-white/10 shrink-0" />

            <button type="button" onClick={props.onEndCall}
              className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-semibold px-3 sm:px-5 py-3 min-h-[48px] transition-all active:scale-95 shadow-lg shadow-rose-500/25 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
              <span className="hidden xs:inline sm:inline text-sm">End</span>
            </button>
          </div>
        </div>
      </div>

      {/* Participants panel */}
      {props.participantsOpen && (
        <div className="absolute right-3 top-16 sm:right-4 sm:top-20 z-20 w-60 sm:w-64 bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-white/10 p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-semibold text-sm">In this call</p>
            <span className="text-white/40 text-xs bg-white/10 px-2 py-0.5 rounded-full">{props.callPeers.length + 1}</span>
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {/* Self */}
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-white/8">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">Y</div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">You</p>
                <p className="text-white/40 text-xs">{props.isMuted ? 'Muted' : 'Active'}</p>
              </div>
              {props.isMuted && <svg className="w-3.5 h-3.5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>}
            </div>
            {/* Peers */}
            {props.callPeers.map(peer => (
              <div key={peer.userId} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/8 transition-colors">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0">{peer.username.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{peer.username}</p>
                  <p className="text-white/40 text-xs">{peer.stream ? 'Connected' : 'Connecting…'}</p>
                </div>
                <span className={`w-2 h-2 rounded-full shrink-0 ${peer.stream ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              </div>
            ))}
            {props.callPeers.length === 0 && (
              <p className="text-white/30 text-xs text-center py-3">Waiting for others to join…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ControlButton ─────────────────────────────────────────────────────────────
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
    <button type="button" onClick={onClick} title={label}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2.5 py-2.5 sm:px-3 text-xs font-medium transition-all duration-200 active:scale-95 min-w-[44px] sm:min-w-[52px] min-h-[48px] ${active ? activeClasses : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
      {icon}
      <span className="text-[9px] sm:text-[10px] leading-none truncate max-w-[52px]">{label}</span>
    </button>
  );
}
