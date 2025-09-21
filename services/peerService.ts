// A simple service to wrap the WebRTC logic

// Using public STUN servers for NAT traversal.
const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

// This function helps us wait until all ICE candidates have been gathered.
// In a real-world app, "trickle ICE" would be used for faster connections,
// but this approach is simpler for a manual copy-paste exchange.
const waitForIceGathering = (pc: RTCPeerConnection): Promise<void> => {
    return new Promise(resolve => {
        if (pc.iceGatheringState === 'complete') {
            resolve();
        } else {
            const checkState = () => {
                if (pc.iceGatheringState === 'complete') {
                    pc.removeEventListener('icegatheringstatechange', checkState);
                    resolve();
                }
            };
            pc.addEventListener('icegatheringstatechange', checkState);
        }
    });
};

/**
 * Creates a connection as the host, generates an offer, and sets up a data channel.
 * @returns A promise that resolves with the peer connection, the offer, and the data channel.
 */
export const createHostOffer = async () => {
    const pc = new RTCPeerConnection(iceServers);
    const dataChannel = pc.createDataChannel('gameData', { ordered: false, maxRetransmits: 0 });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await waitForIceGathering(pc);

    // The localDescription now contains the full offer with all ICE candidates.
    return { pc, offer: pc.localDescription, dataChannel };
};

/**
 * Creates a connection as the client, processes the host's offer, and generates an answer.
 * @param offer - The offer received from the host.
 * @returns A promise that resolves with the peer connection, the answer, and the data channel.
 */
export const createClientAnswer = async (offer: RTCSessionDescriptionInit) => {
    const pc = new RTCPeerConnection(iceServers);

    // This promise will resolve when the host opens the data channel.
    const dataChannelPromise: Promise<RTCDataChannel> = new Promise(resolve => {
        pc.ondatachannel = (event) => {
            resolve(event.channel);
        };
    });

    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await waitForIceGathering(pc);
    
    const dataChannel = await dataChannelPromise;

    // The localDescription now contains the full answer with all ICE candidates.
    return { pc, answer: pc.localDescription, dataChannel };
};

/**
 * Finalizes the host's connection by setting the client's answer.
 * @param pc - The host's peer connection instance.
 * @param answer - The answer received from the client.
 */
export const finalizeHostConnection = async (pc: RTCPeerConnection, answer: RTCSessionDescriptionInit) => {
    await pc.setRemoteDescription(answer);
};
