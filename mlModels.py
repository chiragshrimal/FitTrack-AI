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
import time

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


    async def recv(self):
        """Receives and processes video frames in real-time."""
        global last_feedback_time
        
        frame = await self.track.recv()
        
        img = frame.to_ndarray(format="bgr24")  # Convert frame to OpenCV format
        # Downscale image
        # Increment frame counter
        self.frame_count += 1
        # Only process every Nth frame (e.g., every 2nd or 3rd frame)
        process_this_frame = (self.frame_count % 5 == 0)
        
        # Get current time for feedback timing
        current_time = asyncio.get_event_loop().time()
        
        landmarks = None
        if process_this_frame:
            # Process the frame (just getting landmarks)
            processed_img, landmarks = self.processor.process_frame(img)
            
            # If we have landmarks and the queue isn't full, add to processing queue
            if landmarks and not self.processing_queue.full():
                try:
                    # Try to put landmarks in queue without blocking
                    self.processing_queue.put_nowait(landmarks)
                except asyncio.QueueFull:
                    pass  # Skip if queue is full (we'll process next frame)
        else:
            # For skipped frames, just do minimal processing (like drawing landmarks)
            processed_img = img  # Or minimal processing here
        
        # Get the latest analysis results (thread-safe)
        async with self.analysis_lock:
            analysis = dict(self.last_analysis)  # Make a copy to avoid race conditions
        
        # Draw visual feedback on the frame
        cv2.putText(processed_img, f"Reps: {analysis['repCount']}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.putText(processed_img, f"Form: {analysis['form']}", (10, 70),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        cv2.putText(processed_img, f"Accuracy: {analysis.get('accuracy', 0):.1f}%", (10, 110),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
        
        # Add position state
        position_str = analysis.get('position', 'unknown')
        cv2.putText(processed_img, f"Position: {position_str}", (10, 150),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 255), 2)
        
        # Send feedback at a lower frequency (e.g., every 0.5s)
        if current_time - last_feedback_time > 0.5:  
            last_feedback_time = current_time
            # Create a task for sending feedback to avoid blocking
            asyncio.create_task(send_feedback(analysis))
        
        # Convert back to WebRTC-compatible frame
        new_frame = VideoFrame.from_ndarray(processed_img, format="bgr24")
        new_frame.pts = frame.pts
        new_frame.time_base = frame.time_base
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
        if pc.connectionState == "failed" or pc.connectionState == "closed":
            # Clean up if connection fails
            if pc:
                await pc.close()
    
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
    """Handles ICE Candidate exchange for NAT Traversal."""
    global pc
    if pc and data:
        await pc.addIceCandidate(data)

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
            await asyncio.sleep(5)
    
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