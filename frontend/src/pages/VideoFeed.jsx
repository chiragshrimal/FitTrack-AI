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

  const exercises = [
    { id: "pushup", name: "Push-ups" },
    { id: "pullup", name: "Pull-ups" },
    { id: "squat", name: "Squats" },
    { id: "crunch", name: "Crunches" },
    { id: "bicepcurl", name: "Bicep Curls" }
  ];

  const axiosPrivate = useAxiosPrivate();

  const resetButtonClick = () => {
    setStartTime(null);
    setEndTime(null);
    setRepCount(0);
    setFeedback(null);
    setSessionRepCount(0);
  }

  const saveRecordCount = async () => {
    if (!currentExercise || !startTime || !endTime) {
      console.error("Missing required data");
      return;
    }
    
    const workoutData = {
      exercise: currentExercise, // Assuming exercise data is stored in userInfo
      count: repCount, // Assuming repCount is available in your state
      startTime: startTime.toISOString(), // Convert Date to string format
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
  }

  // Debug helper functions
  const debugSocket = () => {
    if (!socket) {
      console.error("Socket is null or undefined");
      return;
    }
    
    console.log("Socket state:", {
      id: socket.id,
      connected: socket.connected,
      disconnected: socket.disconnected
    });
  };

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

  useEffect(() => {
    if (!socket) return;
    setIsConnected(true);
    setConnectionError(null);

    socket.on("connect", () => {
      console.log("✅ Connected to WebSocket:", socket.id);
      debugSocket();
    });

    socket.on("webrtc-answer", async (data) => {
      console.log("📡 Received SDP Answer, setting remote description...");
      try {
        await PeerService.setLocalDescription(data);
        logPeerConnectionState();
      } catch (err) {
        console.error("Failed to set remote description:", err);
        setConnectionError("Failed to establish video connection");
      }
    });

    socket.on("ice-candidate", async (data) => {
      console.log("📡 Received ICE Candidate, adding...");
      try {
        if (PeerService.peer) {
          await PeerService.peer.addIceCandidate(new RTCIceCandidate(data));
          console.log("ICE candidate added successfully");
        } else {
          console.error("Cannot add ICE candidate: peer connection not initialized");
        }
      } catch (err) {
        console.error("Failed to add ICE candidate:", err);
      }
    });

    socket.on("exercise-feedback", (data) => {
      console.log("📊 Received exercise feedback:", data);
      setFeedback(data.feedback);
      // setRepCount(data.repCount);
      setSessionRepCount(data.repCount);
    });

    socket.on("python-disconnected", () => {
      console.log("❌ AI processing server is offline");
      setConnectionError("AI processing server is offline");
      stopRecording();
    });

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

  // Periodic connection status check
  useEffect(() => {
    const interval = setInterval(() => {
      if (isRecording) {
        console.log("--- Periodic connection check ---");
        debugSocket();
        logPeerConnectionState();
      }
    }, 5000); // Check every 5 seconds while recording
    
    return () => clearInterval(interval);
  }, [isRecording]);

  // Component cleanup
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

      // Reset stats when starting a new recording
      // setRepCount(0);
      // setFeedback(null);

      // Initialize PeerService
      console.log("Initializing PeerService...");
      PeerService.init();

      // Get webcam stream
      console.log("Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, frameRate: 30 }, 
        audio: false
      });
      
      console.log("Camera access granted, attaching to video element");
      webcamRef.current.srcObject = stream;
      
      // Attach the stream to WebRTC Peer Connection
      console.log("Adding tracks to peer connection");
      stream.getTracks().forEach((track) => {
        PeerService.peer.addTrack(track, stream);
        console.log(`Added ${track.kind} track to peer connection`);
      });

      // Add event handlers for connection monitoring
      PeerService.peer.oniceconnectionstatechange = () => {
        const state = PeerService.peer.iceConnectionState;
        console.log("ICE Connection state change:", state);
        logPeerConnectionState();
        
        if (state === "failed" || state === "disconnected" || state === "closed") {
          console.error(`ICE Connection state: ${state}`);
          setConnectionError(`ICE Connection ${state}`);
          
          // Only stop recording if it was previously recording successfully
          if (isRecording) {
            stopRecording();
          }
        }
      };

      PeerService.peer.onsignalingstatechange = () => {
        console.log("Signaling state change:", PeerService.peer.signalingState);
        logPeerConnectionState();
      };

      // Create and send SDP Offer with exercise type
      console.log("Creating SDP offer...");
      const offer = await PeerService.getOffer();
      console.log("Sending offer to server with exercise type:", currentExercise);
      socket.emit("webrtc-offer", { 
        sdp: offer.sdp, 
        type: offer.type,
        exerciseType: currentExercise 
      });

      // Handle incoming video stream (processed by Python AI)
      PeerService.peer.ontrack = (event) => {
        console.log("📡 Received processed video track!");
        if (remoteVideoRef.current) {
          console.log("Attaching remote stream to video element");
          remoteVideoRef.current.srcObject = event.streams[0];
        } else {
          console.error("Remote video reference is not available");
        }
      };

      // Handle ICE Candidate exchange
      PeerService.peer.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("📡 ICE candidate generated, sending to server...");
          socket.emit("ice-candidate", event.candidate);
        }
      };

      // Handle connection state changes
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
      
      console.log("Recording started successfully");
      if(startTime == null){
        setStartTime(new Date()); // Set the current time when recording starts
      }
      setEndTime(null); // Reset end time when a new recording starts
      setSessionRepCount(0);
    } catch (err) {
      console.error("Error starting recording:", err);
      setConnectionError(`Failed to access camera: ${err.message}`);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    console.log("Stopping recording...");
    setIsRecording(false);

    // send post request
    
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
          <video ref={webcamRef} autoPlay playsInline muted className="webcam" />
          <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
          
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

        {repCount > 0 && !isRecording && (
          <>
            <button className="btn-start" onClick={resetButtonClick} >
              Reset
            </button>
            <button className="btn-start" onClick={saveRecordCount} >
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
      </div>
    </div>
  );
};

export default VideoFeed;