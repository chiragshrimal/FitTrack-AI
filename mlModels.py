import asyncio
import socketio
import logging
import cv2
import numpy as np
from aiortc import RTCPeerConnection, RTCSessionDescription, MediaStreamTrack
from aiortc.contrib.media import MediaRelay
from av import VideoFrame
from Pushup import PushUpExerciseProcessor
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("socketio")

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
        self.processor = PushUpExerciseProcessor()
        self.processor.set_exercise_type(exercise_type)
        
                # Start the background processing task
        self.processing_task = asyncio.create_task(self._background_processor())
        
        # logger.info(f"Starting processing with exercise type: {exercise_type}")
        
        # logger.info(f"Starting processing with exercise type: {exercise_type}")

    def update_exercise_type(self, new_type):
        """Update the exercise type being processed"""
        # logger.info(f"Updating exercise type to {new_type}")
        self.processor.set_exercise_type(new_type)

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
                # logger.error(f"Error in background processor: {e}")
                await asyncio.sleep(0.1)  # Prevent tight loop on errors


    async def recv(self):
        """Receives and processes video frames in real-time."""
        global last_feedback_time
        
        frame = await self.track.recv()
        # current_time = time.time()

        # FPS Calculation
        # if self.last_frame_time is not None:
        #     time_diff = current_time - self.last_frame_time
        #     if time_diff > 0:
        #         self.fps = round(1.0 / time_diff, 2)  # Calculate FPS with two decimal precision

        # self.last_frame_time = current_time  # Update last frame time
        
        # # Initialize frame counter if needed
        # if not hasattr(self, 'frame_count'):
        #     self.frame_count = 0
        # self.frame_count += 1
            
        # # Only process every 2nd or 3rd frame
        # if self.frame_count % 3 != 0:
        #     return frame  # Return original frame unprocessed
        
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
    print("📡 Connected to Node.js Signaling Server!")
    await sio.emit("connect-python")
    print("✅ Sent 'connect-python' event to Node.js")

@sio.event
async def disconnect():
    """Handles WebSocket disconnection."""
    print("🔴 Disconnected from WebSocket Server!")
    # Clean up any existing peer connection
    global pc
    if pc:
        await pc.close()
        pc = None

@sio.on("webrtc-offer")
async def on_offer(data):
    """Receives SDP Offer from Node.js and sends SDP Answer."""
    global pc, current_exercise
    
    print("🎥 Received SDP Offer from Node.js")
    
    # Extract exercise type from offer
    exercise_type = data.get("exerciseType", "pushup")
    current_exercise = exercise_type
    print(f"🏋️ Exercise Type: {exercise_type}")
    
    # Close any existing peer connection
    if pc:
        await pc.close()
    
    # Create new peer connection
    pc = RTCPeerConnection()
    
    # Set up track event handler
    @pc.on("track")
    def on_track(track):
        if track.kind == "video":
            print("📡 Video Track Received! Processing...")
            # Create video processing track with the specified exercise type
            processed_track = VideoProcessTrack(track, exercise_type)
            pc.addTrack(processed_track)
    
    # Set up data channel for additional communication
    @pc.on("datachannel")
    def on_datachannel(channel):
        @channel.on("message")
        def on_message(message):
            print(f"💬 Received message from data channel: {message}")
    
    # Set up connection state change handlers
    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        print(f"Connection state changed to: {pc.connectionState}")
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
    print("📨 Sent SDP Answer to Node.js")

@sio.on("ice-candidate")
async def on_ice_candidate(data):
    """Handles ICE Candidate exchange for NAT Traversal."""
    global pc
    print("❄️ Received ICE Candidate from Node.js")
    if pc and data:
        await pc.addIceCandidate(data)

@sio.on("exercise-change")
async def on_exercise_change(data):
    """Handle exercise type changes during an active session"""
    global current_exercise
    
    new_exercise = data.get("exerciseType")
    if new_exercise and new_exercise != current_exercise:
        print(f"🔄 Changing exercise from {current_exercise} to {new_exercise}")
        current_exercise = new_exercise
        
        # Update the exercise type for the processing track
        if pc:
            for sender in pc.getSenders():
                if sender.track and isinstance(sender.track, VideoProcessTrack):
                    sender.track.update_exercise_type(new_exercise)

async def connect_to_server():
    """Connects to the WebSocket signaling server."""
    try:
        print("🔄 Attempting WebSocket Connection...")
        await sio.connect(
            "http://localhost:5002",
            socketio_path="/socket.io/",
            transports=["websocket"],
            wait_timeout=15
        )
        print("✅ Connected to WebSocket Server!")
        return True
    except socketio.exceptions.ConnectionError as e:
        print(f"❌ WebSocket Connection Error: {e}")
        return False

async def main():
    """Main function to initiate WebSocket connection and keep it alive."""
    connected = False
    retry_count = 0
    
    while not connected and retry_count < 5:
        connected = await connect_to_server()
        if not connected:
            retry_count += 1
            print(f"⚠️ Connection attempt {retry_count} failed. Retrying in 5 seconds...")
            await asyncio.sleep(5)
    
    if not connected:
        print("⚠️ Failed to connect after multiple attempts. Exiting.")
        return
        
    try:
        # Keep connection alive
        while True:
            await asyncio.sleep(30)  # Keep-alive check
            if sio.connected:
                print("📶 Connection active")
            else:
                print("⚠️ Connection lost, reconnecting...")
                await connect_to_server()
    except asyncio.CancelledError:
        print("⚠️ Task cancelled")
    except KeyboardInterrupt:
        print("⚠️ Program interrupted by user")
    finally:
        # Cleanup
        global pc
        if pc:
            await pc.close()
            pc = None
            
        if sio.connected:
            print("🧹 Closing connection...")
            await sio.disconnect()
        print("✅ Cleanup complete")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("⚠️ Program terminated by user")