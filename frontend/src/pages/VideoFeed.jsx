import React, { useRef, useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";
import useAuth from "../hooks/useAuth";
import Webcam from "react-webcam";
import PeerService from "../service/peer";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import "./VideoFeed.css";

const VideoFeed = () => {
  const { auth } = useAuth();

  if (auth?.user?.userType !== "trainee") {
    return <Navigate to="/access-denied" replace />;
  }

  const socket = useSocket();
  const webcamRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentExercise, setCurrentExercise] = useState("pushup");
  const [feedback, setFeedback] = useState(null);
  const [repCount, setRepCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [sessionRepCount, setSessionRepCount] = useState(0);
  const [remoteStreamInfo, setRemoteStreamInfo] = useState(null);
  const [showRemoteVideo, setShowRemoteVideo] = useState(true);
  const [connectionPhase, setConnectionPhase] = useState("disconnected");

  const exercises = [
    { id: "pushup", name: "Push-ups" },
    { id: "pullup", name: "Pull-ups" },
    { id: "squat", name: "Squats" },
    { id: "crunch", name: "Crunches" },
    { id: "bicepcurl", name: "Bicep Curls" }
  ];

  const axiosPrivate = useAxiosPrivate();

  // WHEN THE RESET BUTTON IS CLICKED
  const resetButtonClick = () => {
    setStartTime(null);
    setEndTime(null);
    setRepCount(0);
    setFeedback(null);
    setSessionRepCount(0);
  };

  // WHEN SAVED RECORD BUTTON IS CLICKED
  const saveRecordCount = async () => {
    if (!currentExercise || !startTime || !endTime) {
      console.error("Missing required data");
      return;
    }
    
    const workoutData = {
      exercise: currentExercise,
      count: repCount,
      startTime: startTime.toISOString(),
      stopTime: endTime.toISOString(),
    };
  
    try {
      const response = await axiosPrivate.post("/api/trainee/workout", workoutData);
      console.log("Workout saved successfully:", response.data);
    } catch (error) {
      console.error("Error saving workout:", error);
    }
    setStartTime(null);
    setEndTime(null);
    setRepCount(0);
    setFeedback(null);
  };

  // DEBUG SOCKET, CONSOLE IF SOCKET IS NULL ELSE DO NOTHING
  const debugSocket = () => {
    if (!socket) {
      console.error("Socket is null or undefined");
      return;
    }
  };

  // CONSOLE THE PEER CONNECTION STATE OR CONSOLE PEER NOT INITIALIZED
  const logPeerConnectionState = () => {
    if (!PeerService.peer) {
      console.log("PeerConnection not initialized");
      return;
    }
    
    console.log("PeerConnection state:", {
      signalingState: PeerService.peer.signalingState,
      iceConnectionState: PeerService.peer.iceConnectionState,
      iceGatheringState: PeerService.peer.iceGatheringState,
      connectionState: PeerService.peer.connectionState
    });
  };

  // Periodically check stream status when recording
  useEffect(() => {
    if (!isRecording) return;
    
    const checkInterval = setInterval(() => {
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
        const tracks = remoteVideoRef.current.srcObject.getTracks();
        const info = {
          time: new Date().toISOString(),
          tracks: tracks.length,
          active: remoteVideoRef.current.srcObject.active,
          paused: remoteVideoRef.current.paused,
          readyState: remoteVideoRef.current.readyState,
          trackDetails: tracks.map(t => ({
            kind: t.kind,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState
          }))
        };
        console.log("Stream check:", info);
        setRemoteStreamInfo(info);
      } else {
        console.log("No remote stream available for status check");
      }
    }, 3000);
    
    return () => clearInterval(checkInterval);
  }, [isRecording]);

  // handles websocket communication of connect, webrtc answer, ice candidate, feedback and disconnection
  useEffect(() => {
    if (!socket) return;
    setIsConnected(true);
    setConnectionError(null);

    // CONSOLE CONNECTED TO WEBSOCKET
    socket.on("connect", () => {
      console.log("✅ Connected to WebSocket:", socket.id);
      debugSocket();
    });

    // Receive answer and set you local description else log error
    socket.on("webrtc-answer", async (answer) => {
      console.log("Received SDP answer from server");
      try {
        await PeerService.peer.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("Remote description set successfully");
      } catch (err) {
        console.error("Error setting remote description:", err);
        setConnectionError(`Failed to establish connection: ${err.message}`);
      }
    });

    // Add ice candidate if received any otherwise console whatever error faced
    socket.on("ice-candidate", async (candidate) => {
      console.log("Received ICE candidate from server");
      try {
        if (PeerService.peer.remoteDescription) {
          await PeerService.peer.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("Added received ICE candidate");
        } else {
          console.warn("Received ICE candidate before remote description, queuing...");
          // You might want to implement a queue for ICE candidates received before the remote description
        }
      } catch (err) {
        console.error("Error adding received ICE candidate:", err);
      }
    });
    
    // get the feedback from websocket and update Feedback and RepCount
    socket.on("exercise-feedback", (data) => {
      console.log("📊 Received exercise feedback:", data);
      setFeedback(data.feedback);
      // setRepCount(data.repCount);
      setSessionRepCount(data.repCount);
    });

    // If the python files gets disconnected then Set Connection Error
    socket.on("python-disconnected", () => {
      console.log("❌ AI processing server is offline");
      setConnectionError("AI processing server is offline");
      stopRecording();
    });

    // Disconnection yourself from server
    socket.on("disconnect", () => {
      console.log("❌ Disconnected from WebSocket");
      setIsConnected(false);
      setConnectionError("Disconnected from server");
      stopRecording();
    });

    // Test socket connection on mount
    console.log("Initial socket status check:");
    debugSocket();

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("webrtc-answer");
      socket.off("ice-candidate");
      socket.off("exercise-feedback");
      socket.off("python-disconnected");
    };
  }, [socket]);

  // Cleanup the PeerService and stop recording
  useEffect(() => {
    // Cleanup function to ensure WebRTC is properly cleaned up when component unmounts
    return () => {
      console.log("Component unmounting, cleaning up resources");
      stopRecording();
      if (PeerService.peer) {
        PeerService.cleanup();
      }
    };
  }, []);

  const startRecording = async () => {
    if (!webcamRef.current) {
      console.error("Webcam reference is not available");
      return;
    }
    
    try {
      console.log("Starting recording...");
    setIsRecording(true);
    setConnectionError(null);
    setRemoteStreamInfo(null);
    setConnectionPhase("connecting");
  
      // Initialize PeerService
      console.log("Initializing PeerService...");
      PeerService.init();
  
      // Set up connection state monitoring first (before adding tracks)
      setupConnectionMonitoring();
  
      // Get webcam stream
      console.log("Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, frameRate: 30 }, 
        audio: false
      });
      
      console.log("Camera access granted, attaching to video element");
      webcamRef.current.srcObject = stream;
      
      // Add tracks to peer connection
      console.log("Adding tracks to peer connection");
      stream.getTracks().forEach((track) => {
        PeerService.peer.addTrack(track, stream);
        console.log(`Added ${track.kind} track to peer connection`);
      });
  
      // Create and send SDP Offer with exercise type
      console.log("Creating SDP offer...");
      const offer = await PeerService.getOffer();
      console.log("Sending offer to server with exercise type:", currentExercise);
      socket.emit("webrtc-offer", { 
        sdp: offer.sdp, 
        type: offer.type,
        exerciseType: currentExercise 
      });
  
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (PeerService.peer.connectionState !== "connected") {
          console.error("Connection timeout reached");
          setConnectionError("Connection timeout - please try again");
          stopRecording();
        }
      }, 15000); // 15 second timeout
  
      // Clear timeout when connected successfully
      const clearTimeoutOnConnect = () => {
        if (PeerService.peer.connectionState === "connected") {
          clearTimeout(connectionTimeout);
          // Remove this listener once we're connected
          PeerService.peer.removeEventListener("connectionstatechange", clearTimeoutOnConnect);
        }
      };
      PeerService.peer.addEventListener("connectionstatechange", clearTimeoutOnConnect);
  
      console.log("Recording started successfully");
      if(startTime == null){
        setStartTime(new Date());
      }
      setEndTime(null);
      setSessionRepCount(0);
    } catch (err) {
      console.error("Error starting recording:", err);
      setConnectionError(`Failed to access camera: ${err.message}`);
      setIsRecording(false);
    }
  };
  
  // Extract connection monitoring to a separate function
  const setupConnectionMonitoring = () => {
    // Handle incoming video stream (processed by Python AI)
    PeerService.peer.ontrack = (event) => {
      console.log("📡 Received processed video track!", event.streams);
      
      // Debug stream info
      const streamInfo = {
        active: event.streams[0]?.active,
        id: event.streams[0]?.id,
        tracks: event.streams[0]?.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState
        }))
      };
      console.log("Stream info:", streamInfo);
      
      if (remoteVideoRef.current && event.streams[0]) {
        console.log("Attaching remote stream to video element");
        
        // Remove any existing streams first
        if (remoteVideoRef.current.srcObject) {
          remoteVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
          remoteVideoRef.current.srcObject = null;
        }
        
        // Set the new stream
        remoteVideoRef.current.srcObject = event.streams[0];
        
        // Force play
        remoteVideoRef.current.play().catch(err => {
          console.error("Error playing remote video:", err);
        });

        // Add a track event listener to monitor when frames start flowing
      const videoTrack = event.streams[0].getVideoTracks()[0];
      if (videoTrack) {
        // Create a frame counter to detect when real frames (not blank) are flowing
        let frameCounter = 0;
        const frameInterval = setInterval(() => {
          if (remoteVideoRef.current?.srcObject?.active) {
            frameCounter++;
            if (frameCounter > 10) {
              console.log("Stream appears to be flowing with real frames");
              setConnectionPhase("established");
              clearInterval(frameInterval);
            }
          }
        }, 500);
      }

      } else {
        console.error("Remote video reference is not available or no streams");
      }
    };
  
    // Single ICE candidate handler with error handling
    PeerService.peer.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("📡 ICE candidate generated:", event.candidate);
        try {
          socket.emit("ice-candidate", event.candidate);
        } catch (err) {
          console.error("❌ Failed to send ICE candidate to server:", err);
        }
      } else {
        console.log("ICE candidate gathering complete");
      }
    };
  
    // Monitor ICE connection state
    PeerService.peer.oniceconnectionstatechange = () => {
      const state = PeerService.peer.iceConnectionState;
      console.log("ICE Connection state change:", state);
      logPeerConnectionState();
      
      if (state === "checking") {
        setConnectionPhase("ice-negotiation");
      } else if (state === "connected" || state === "completed") {
        setConnectionPhase("connected");
      } else if (state === "failed" || state === "disconnected" || state === "closed") {
        console.error(`ICE Connection state: ${state}`);
        setConnectionError(`ICE Connection ${state}`);
        setConnectionPhase("disconnected");
        
        if (isRecording) {
          stopRecording();
        }
      }
    };
  
    // Monitor signaling state
    PeerService.peer.onsignalingstatechange = () => {
      console.log("Signaling state change:", PeerService.peer.signalingState);
      logPeerConnectionState();
    };
  
    // Monitor overall connection state
    PeerService.peer.onconnectionstatechange = () => {
      const state = PeerService.peer.connectionState;
      console.log("WebRTC connection state:", state);
      
      if (state === "failed" || state === "disconnected" || state === "closed") {
        console.error(`WebRTC connection ${state}`);
        setConnectionError(`WebRTC connection ${state}`);
        stopRecording();
      } else if (state === "connected") {
        console.log("WebRTC connection established successfully!");
      }
    };
  };

  const stopRecording = () => {
    
    console.log("Stopping recording...");
    setIsRecording(false);
    
    // Stop all tracks from webcam
    if (webcamRef.current?.srcObject) {
      console.log("Stopping webcam tracks...");
      webcamRef.current.srcObject.getTracks().forEach(track => {
        console.log(`Stopping ${track.kind} track`);
        track.stop();
      });
      webcamRef.current.srcObject = null;
    }
    
    // Stop remote video
    if (remoteVideoRef.current?.srcObject) {
      console.log("Stopping remote video tracks...");
      remoteVideoRef.current.srcObject.getTracks().forEach(track => {
        console.log(`Stopping remote ${track.kind} track`);
        track.stop();
      });
      remoteVideoRef.current.srcObject = null;
    }
    
    // Clean up WebRTC connection
    console.log("Cleaning up WebRTC connection");
    if (PeerService.peer) {
      PeerService.cleanup();
    }
    
    setEndTime(new Date());
    setRepCount(prevTotal => prevTotal + sessionRepCount);
    console.log("Recording stopped");
  };

  // Handle exercise change during active recording
  useEffect(() => {
    if (isRecording && isConnected) {
      console.log(`Sending exercise change to: ${currentExercise}`);
      // Send exercise type update to server
      socket.emit("exercise-change", { exerciseType: currentExercise });
    }
  }, [currentExercise, isRecording, isConnected, socket]);

  // Helper function to format video track status for display
  const getVideoStatus = () => {
    if (!remoteVideoRef.current) return "No video ref";
    if (!remoteVideoRef.current.srcObject) return "No stream";
    
    const tracks = remoteVideoRef.current.srcObject.getTracks();
    if (tracks.length === 0) return "No tracks";
    
    const videoTracks = tracks.filter(t => t.kind === "video");
    if (videoTracks.length === 0) return "No video tracks";
    
    return `${videoTracks.length} video track(s), ${videoTracks[0].readyState}`;
  };

  return (
    <div className="video-feed">
      <div className="video-container">
        {/* Exercise Selector */}
        <div className="exercise-selector">
          <label htmlFor="exercise">Select Exercise:</label>
          <select
            className="exercise-select"
            id="exercise"
            value={currentExercise}
            onChange={(e) => setCurrentExercise(e.target.value)}
            disabled={isRecording}
          >
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>
        </div>

        {/* Webcam Feed */}
        <div className="webcam-container">
          <video 
            ref={webcamRef} 
            autoPlay 
            playsInline 
            muted 
            className="webcam" 
            style={{ display: showRemoteVideo ? 'none' : 'block' }}
          />
          
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="remote-video" 
            style={{ display: showRemoteVideo ? 'block' : 'none' }}
            onLoadedMetadata={() => console.log("Remote video metadata loaded")}
            onPlay={() => console.log("Remote video playback started")}
            onError={(e) => console.error("Remote video error:", e)}
          />
          
          {/* Diagnostic overlay */}
          <div className="diagnostic-overlay">
            <p>Connect: {PeerService.peer?.connectionState || 'Not initialized'}</p>
            <p>ICE: {PeerService.peer?.iceConnectionState || 'Not initialized'}</p>
            <p>Phase: {connectionPhase}</p>
            <p>Video: {getVideoStatus()}</p>
            <p>Ready: {remoteVideoRef.current?.readyState >= 2 ? 'Yes' : 'No'}</p>
          </div>
          
          {feedback && (
            <div className="feedback-overlay">
              <div className="feedback-content">
                <p className="form-feedback">{feedback.form}</p>
                <div className="confidence-meter">
                  <div 
                    className="confidence-bar" 
                    style={{ width: `${feedback.accuracy}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          
          {connectionError && (
            <div className="error-overlay">
              <div className="error-content">
                <p>{connectionError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="controls">
          {!isRecording ? (
            <button 
              className="btn-start" 
              onClick={startRecording}
              disabled={!isConnected || connectionError}
            >
              Start Recording
            </button> 
          ) : (
            <button className="btn-stop" onClick={stopRecording}>
              Stop Recording
            </button>
          )}

          <button 
            className="btn-toggle" 
            onClick={() => setShowRemoteVideo(!showRemoteVideo)}
            disabled={!isRecording}
          >
            {showRemoteVideo ? "Show Local Camera" : "Show Processed Video"}
          </button>

          {repCount > 0 && !isRecording && (
            <>
              <button className="btn-start" onClick={resetButtonClick}>
                Reset
              </button>
              <button className="btn-start" onClick={saveRecordCount}>
                Save Record
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Panel */}
      <div className="stats-panel">
        <div className="stat-item">
          <h3>Exercise</h3>
          <p>{exercises.find((e) => e.id === currentExercise)?.name}</p>
        </div>
        <div className="stat-item">
          <h3>Rep Count</h3>
          <p>{repCount}</p>
        </div>
        {feedback && (
          <div className="stat-item">
            <h3>Form Confidence</h3>
            <p>{Math.round(feedback.accuracy)}%</p>
          </div>
        )}
        <div className="stat-item">
          <h3>Connection Status</h3>
          <p className={isConnected ? "connected" : "disconnected"}>
            {isConnected ? "Connected" : "Disconnected"}
          </p>
        </div>
        <div className="stat-item">
          <h3>View Mode</h3>
          <p>{showRemoteVideo ? "Processed Video" : "Local Camera"}</p>
        </div>
      </div>
    </div>
  );
};

export default VideoFeed;