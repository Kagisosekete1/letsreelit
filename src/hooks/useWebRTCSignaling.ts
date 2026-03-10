import { useRef, useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * WebRTC P2P signaling via Supabase Realtime broadcast.
 * Broadcaster publishes local stream; viewers receive remote stream.
 */
export function useWebRTCBroadcaster(sessionId: string | null, localStream: MediaStream | null) {
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const cleanup = useCallback(() => {
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!sessionId || !localStream) return;

    const channel = supabase.channel(`webrtc-signal:${sessionId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'viewer-join' }, async ({ payload }) => {
        const viewerId = payload.viewerId as string;
        if (peerConnections.current.has(viewerId)) return;

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peerConnections.current.set(viewerId, pc);

        // Add local tracks
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            channel.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: { targetId: viewerId, candidate: e.candidate.toJSON(), from: 'broadcaster' },
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            pc.close();
            peerConnections.current.delete(viewerId);
          }
        };

        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        channel.send({
          type: 'broadcast',
          event: 'offer',
          payload: { targetId: viewerId, sdp: offer },
        });
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        const { fromId, sdp } = payload;
        const pc = peerConnections.current.get(fromId);
        if (pc && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.from === 'broadcaster') return;
        const pc = peerConnections.current.get(payload.fromId);
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.log('ICE candidate error:', e);
          }
        }
      })
      .subscribe();

    return cleanup;
  }, [sessionId, localStream, cleanup]);

  // When stream changes (e.g. camera flip), replace tracks on all peers
  useEffect(() => {
    if (!localStream) return;
    peerConnections.current.forEach(pc => {
      const senders = pc.getSenders();
      localStream.getTracks().forEach(track => {
        const sender = senders.find(s => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track).catch(console.log);
        }
      });
    });
  }, [localStream]);

  return { cleanup, peerCount: peerConnections.current.size };
}

export function useWebRTCViewer(sessionId: string | null, viewerId: string | null) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<string>('new');

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setRemoteStream(null);
    setConnectionState('new');
  }, []);

  useEffect(() => {
    if (!sessionId || !viewerId) return;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    const stream = new MediaStream();
    setRemoteStream(stream);

    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach(track => {
        stream.addTrack(track);
      });
      // Force re-render
      setRemoteStream(new MediaStream(stream.getTracks()));
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
    };

    const channel = supabase.channel(`webrtc-signal:${sessionId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.targetId !== viewerId) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        channel.send({
          type: 'broadcast',
          event: 'answer',
          payload: { fromId: viewerId, sdp: answer },
        });
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.from !== 'broadcaster') return;
        if (payload.targetId !== viewerId) return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e) {
          console.log('ICE add error:', e);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Tell broadcaster we want to connect
          channel.send({
            type: 'broadcast',
            event: 'viewer-join',
            payload: { viewerId },
          });
        }
      });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        channel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { fromId: viewerId, candidate: e.candidate.toJSON(), from: 'viewer' },
        });
      }
    };

    return cleanup;
  }, [sessionId, viewerId, cleanup]);

  return { remoteStream, connectionState, cleanup };
}
