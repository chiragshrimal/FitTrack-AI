class PeerService {
  constructor() {
    this.peer = null;
  }

  init() {
    if (this.peer) {
      this.cleanup(); // Clean up existing connection first
    }
    
    this.peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
          ]
        }
      ],
      iceCandidatePoolSize: 3 // Increases the pool of ICE candidates
    });
    
    console.log("PeerService initialized with new RTCPeerConnection");
    return this.peer;
  }

  async getAnswer(offer) {
    if (!this.peer) {
      console.error("Peer connection not initialized");
      return null;
    }
    
    try {
      await this.peer.setRemoteDescription(offer);
      const ans = await this.peer.createAnswer();
      await this.peer.setLocalDescription(new RTCSessionDescription(ans));
      return ans;
    } catch (err) {
      console.error("Error creating answer:", err);
      throw err;
    }
  }

  async setLocalDescription(ans) {
    if (!this.peer) {
      console.error("Peer connection not initialized");
      return;
    }
    
    try {
      await this.peer.setRemoteDescription(new RTCSessionDescription(ans));
      console.log("Remote description set successfully");
    } catch (err) {
      console.error("Error setting remote description:", err);
      throw err;
    }
  }

  async getOffer() {
    if (!this.peer) {
      console.error("Peer connection not initialized");
      return null;
    }
    
    try {
      const offer = await this.peer.createOffer();
      await this.peer.setLocalDescription(new RTCSessionDescription(offer));
      console.log("Created and set local offer");
      return offer;
    } catch (err) {
      console.error("Error creating offer:", err);
      throw err;
    }
  }

  cleanup() {
    if (this.peer) {
      // Close the peer connection
      this.peer.close();
      this.peer = null;
      console.log("PeerService connection cleaned up");
    }
  }
}

export default new PeerService();