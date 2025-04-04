import asyncio
import socketio
import logging
import cv2
import numpy as np
from aiortc import RTCPeerConnection, RTCSessionDescription, MediaStreamTrack
from aiortc.contrib.media import MediaRelay
from av import VideoFrame
from Pushup import PushUpExerciseProcessor
from crunches import CrunchExerciseProcessor
from pullup import PullUpExerciseProcessor
from bicepcurl import BicepCurlExerciseProcessor
import time
import json
from aiortc import RTCIceCandidate
import fractions

# Initialize WebSocket client for signaling
sio = socketio.AsyncClient(
    logger=True,
    engineio_logger=True,
    reconnection=True,
    reconnection_attempts=5,
    reconnection_delay=2,
    reconnection_delay_max=5
)

# WebRTC Peer Connection
pc = None
relay = MediaRelay()

# Global state
current_exercise = "pushup"
last_feedback_time = 0

def get_exercise_processor(exercise_type):
    """Returns the appropriate exercise processor based on type"""
    if exercise_type.lower() == "crunch":
        return CrunchExerciseProcessor()
    elif exercise_type.lower() == "pullup":
        return PullUpExerciseProcessor()
    elif exercise_type.lower() == "bicepcurl":
        return BicepCurlExerciseProcessor()
    else:
        # Default to pushup processor
        return PushUpExerciseProcessor()

# Video processing track
class VideoProcessTrack(MediaStreamTrack):
    """Custom video stream track to process incoming frames."""
    kind = "video"

    def __init__(self, track, exercise_type):
        super().__init__()
        self.track = relay.subscribe(track)
        self.last_feedback_time = 0
        
        # Initialize last analysis results
        self.last_analysis = {
            'repCount': 0, 
            'form': 'Initializing...', 
            'accuracy': 0, 
            'position': 'unknown'
        }
        
        self.frames_received = 0
        self.connection_phase = "initializing" # Can be "initializing", "connecting", "established"
        
        # Create a lock for analysis updates
        self.analysis_lock = asyncio.Lock()
        
        # Frame counter for processing only some frames
        self.frame_count = 0
        
        # Create a task queue for analysis
        self.processing_queue = asyncio.Queue(maxsize=1)
        
        # Initialize exercise processor
        self.processor = get_exercise_processor(exercise_type)
        
        # Start the background processing task
        self.processing_task = asyncio.create_task(self._background_processor())

        # Start a connection monitor task
        self.connection_monitor = asyncio.create_task(self._monitor_connection())

    async def _background_processor(self):
        """Background task that processes frames asynchronously."""
        while True:
            try:
                # Get landmarks from queue (will wait if queue is empty)
                landmarks = await self.processing_queue.get()
                
                # Process the landmarks
                analysis = self.processor.analyze_exercise(landmarks)
                
                # Update the shared analysis results
                async with self.analysis_lock:
                    self.last_analysis = analysis
                
                # Mark task as done
                self.processing_queue.task_done()
                
                # Small delay to prevent CPU hogging
                await asyncio.sleep(0.01)
            except asyncio.CancelledError:
                break
            except Exception as e:
                await asyncio.sleep(0.1)  # Prevent tight loop on errors

    async def _monitor_connection(self):
        """Monitors connection status and adjusts timeouts accordingly"""
        while True:
            await asyncio.sleep(1)
            if self.frames_received > 5:
                if self.connection_phase != "established":
                    print("Connection established after receiving multiple frames")
                    self.connection_phase = "established"
            elif self.connection_phase == "initializing":
                print("Still initializing connection...")
                self.connection_phase = "connecting"

    async def recv(self):
        """Receives and processes video frames in real-time with improved error handling."""
        global last_feedback_time
        print("Attempting to receive frame")
        
        # Set timeout based on connection phase
        if self.connection_phase == "initializing":
            timeout = 15.0  # Much longer timeout during initial connection
        elif self.connection_phase == "connecting":
            timeout = 10.0  # Longer timeout while establishing connection
        else:
            timeout = 5.0   # Normal timeout once established
        
        # Try to receive a frame with timeout
        try:
            frame = await asyncio.wait_for(self.track.recv(), timeout=5.0)
            print("Frame received successfully")
            self.frames_received += 1
        except asyncio.TimeoutError:
            print("Timeout waiting for frame")
            # Create a blank frame as fallback
            h, w = 480, 640  # Default dimensions
            blank_img = np.zeros((h, w, 3), dtype=np.uint8)
            
            if self.connection_phase == "initializing":
                message = "Establishing connection..."
            elif self.connection_phase == "connecting":
                message = "Waiting for video..."
            else:
                message = "Video timeout, reconnecting..."
                
            cv2.putText(blank_img, "Waiting for video...", (50, 240), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            
            # Create a VideoFrame from the blank image
            frame = VideoFrame.from_ndarray(blank_img, format="bgr24")
            # Set timestamp if needed
            frame.pts = getattr(self, 'last_pts', 0)
            frame.time_base = getattr(self, 'last_time_base', fractions.Fraction(1, 30))
        except Exception as e:
            print(f"Error receiving frame: {e}")
            # Similar fallback as timeout case
            h, w = 480, 640
            blank_img = np.zeros((h, w, 3), dtype=np.uint8)
            cv2.putText(blank_img, f"Error: {str(e)[:20]}", (50, 240), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            frame = VideoFrame.from_ndarray(blank_img, format="bgr24")
            frame.pts = getattr(self, 'last_pts', 0)
            frame.time_base = getattr(self, 'last_time_base', fractions.Fraction(1, 30))
        
        # Store frame timing info for potential future fallbacks
        self.last_pts = frame.pts
        self.last_time_base = frame.time_base
        
        # Convert frame to OpenCV format with error handling
        try:
            img = frame.to_ndarray(format="bgr24")
        except Exception as e:
            print(f"Error converting frame to numpy array: {e}")
            img = np.zeros((480, 640, 3), dtype=np.uint8)
        
        # Increment frame counter
        self.frame_count += 1
        
        # Process every Nth frame
        process_this_frame = (self.frame_count % 5 == 0)
        
        # Get current time for feedback timing
        current_time = asyncio.get_event_loop().time()
        
        # Process frame if needed
        landmarks = None
        processed_img = img.copy()  # Default to original image
        
        if process_this_frame:
            try:
                processed_img, landmarks = self.processor.process_frame(img)
                
                # Add landmarks to processing queue if available
                if landmarks and not self.processing_queue.full():
                    try:
                        self.processing_queue.put_nowait(landmarks)
                    except asyncio.QueueFull:
                        pass  # Skip if queue is full
                
            except Exception as e:
                print(f"Error processing frame: {e}")
                # Continue with unprocessed image if processing fails
        
        # Get latest analysis results with lock
        try:
            async with self.analysis_lock:
                analysis = dict(self.last_analysis)
        except Exception as e:
            print(f"Error getting analysis: {e}")
            analysis = {
                'repCount': 0, 
                'form': 'Error', 
                'accuracy': 0, 
                'position': 'unknown'
            }
        
        # Draw feedback on frame (with try/except for safety)
        try:
            cv2.putText(processed_img, f"Reps: {analysis['repCount']}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(processed_img, f"Form: {analysis['form']}", (10, 70),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            cv2.putText(processed_img, f"Accuracy: {analysis.get('accuracy', 0):.1f}%", (10, 110),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
                        
            position_str = analysis.get('position', 'unknown')
            cv2.putText(processed_img, f"Position: {position_str}", (10, 150),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 255), 2)
        except Exception as e:
            print(f"Error drawing text on frame: {e}")
        
        # Send feedback at a lower frequency
        if current_time - last_feedback_time > 0.5:
            last_feedback_time = current_time
            asyncio.create_task(send_feedback(analysis))
        
        # Convert back to WebRTC-compatible frame
        try:
            new_frame = VideoFrame.from_ndarray(processed_img, format="bgr24")
            new_frame.pts = frame.pts
            new_frame.time_base = frame.time_base
        except Exception as e:
            print(f"Error creating output frame: {e}")
            # Return original frame if conversion fails
            return frame
        
        print("Frame processed successfully")
        return new_frame

async def send_feedback(analysis):
    """Send exercise feedback to Node.js server"""
    if sio.connected:
        await sio.emit("exercise-feedback", {
            "feedback": {
                "form": analysis["form"],
                "accuracy": analysis["accuracy"],
                "position": analysis["position"]
            },
            "repCount": analysis["repCount"],
            "angles": analysis.get("angles", {})
        })

@sio.event
async def connect():
    """Handles WebSocket connection to Node.js"""
    await sio.emit("connect-python")

@sio.event
async def disconnect():
    """Handles WebSocket disconnection."""
    # Clean up any existing peer connection
    global pc
    if pc:
        await pc.close()
        pc = None

@sio.on("webrtc-offer")
async def on_offer(data):
    """Receives SDP Offer from Node.js and sends SDP Answer."""
    global pc, current_exercise
    
    # Extract exercise type from offer
    exercise_type = data.get("exerciseType", "pushup")
    current_exercise = exercise_type
    
    # Close any existing peer connection
    if pc:
        await pc.close()
    
    # Create new peer connection
    pc = RTCPeerConnection()
    
    # Set up track event handler
    @pc.on("track")
    def on_track(track):
        if track.kind == "video":
            print("received video tarck")
            # Create video processing track with the specified exercise type
            processed_track = VideoProcessTrack(track, exercise_type)
            pc.addTrack(processed_track)
    
    # Set up data channel for additional communication
    @pc.on("datachannel")
    def on_datachannel(channel):
        @channel.on("message")
        def on_message(message):
            pass
    
    # Set up connection state change handlers
    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        print(f"Connection state changed to: {pc.connectionState}")
        if pc.connectionState == "connected":
            # Wait a moment for media to start flowing
            await asyncio.sleep(1)
            print("WebRTC connection fully established")
        
    # Process SDP offer
    offer = RTCSessionDescription(sdp=data["sdp"], type=data["type"])
    await pc.setRemoteDescription(offer)
    
    # Create and set local description (answer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    
    # Send SDP Answer back to Node.js
    await sio.emit("webrtc-answer", {
        "type": "answer", 
        "sdp": pc.localDescription.sdp
    })

@sio.on("ice-candidate")
async def on_ice_candidate(data):
    # Ensure data is a dictionary and contains the expected keys
    if isinstance(data, dict) and 'candidate' in data:
        candidate_string = data['candidate']
        print("Candidate data:", candidate_string)
        
        if not candidate_string:
            print("Received empty candidate data")
            return
            
        # Parse the SDP candidate string instead of trying to decode JSON
        # Format is typically: candidate:foundation protocol priority ip port type ...
        parts = candidate_string.split()
        if len(parts) < 8:
            print(f"Invalid candidate format: {candidate_string}")
            return
            
        # Extract components from the parts
        foundation = parts[0].split(':')[1] if ':' in parts[0] else parts[0]
        component = int(parts[1])
        protocol = parts[2]
        priority = int(parts[3])
        ip = parts[4]
        port = int(parts[5])
        candidate_type = parts[7]
        
        # Create a candidate object using aiortc
        try:
            candidate = RTCIceCandidate(
                sdpMid=data.get('sdpMid'),
                sdpMLineIndex=data.get('sdpMLineIndex'),
                foundation=foundation,
                component=component,
                protocol=protocol,
                priority=priority,
                ip=ip,
                port=port,
                type=candidate_type
            )
            
            # Pass the candidate to the PeerConnection
            await pc.addIceCandidate(candidate)
        except Exception as e:
            print(f"Error adding ICE candidate: {e}")
async def connect_to_server():
    """Connects to the WebSocket signaling server."""
    try:
        await sio.connect(
            "http://localhost:5002",
            socketio_path="/socket.io/",
            transports=["websocket"],
            wait_timeout=15
        )
        return True
    except socketio.exceptions.ConnectionError as e:
        return False

async def main():
    """Main function to initiate WebSocket connection and keep it alive."""
    connected = False
    retry_count = 0
    
    while not connected and retry_count < 5:
        connected = await connect_to_server()
        if not connected:
            retry_count += 1
            await asyncio.sleep(20)
    
    if not connected:
        return
        
    try:
        # Keep connection alive
        while True:
            await asyncio.sleep(30)  # Keep-alive check
            if not sio.connected:
                await connect_to_server()
    except asyncio.CancelledError:
        pass
    except KeyboardInterrupt:
        pass
    finally:
        # Cleanup
        global pc
        if pc:
            await pc.close()
            pc = None
            
        if sio.connected:
            await sio.disconnect()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass