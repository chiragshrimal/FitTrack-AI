import cookieParser from 'cookie-parser';
import express from 'express';
import { config } from 'dotenv';
import { Server } from "socket.io";
import { createServer } from "http";
config();
import cors from 'cors';
import morgan from 'morgan';

const PORT = process.env.PORT || 5001;
const WEBSOCKET_PORT = 5002;
const app = express();
app.use(express.json());

// Create HTTP server for WebSocket
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow React & Python clients
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true,  // Allow older `engine.io` versions (fixes some Python issues)
  path: "/socket.io/", // Explicitly set the path
  transports: ["websocket", "polling"]  // Ensure both WebSocket & polling are supported
});

// Track connected clients
let pythonSocket = null;
const connectedClients = new Map(); // Map to track client connections

// Log connected clients count every minute

io.on("connection", (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);
  connectedClients.set(socket.id, { type: 'unknown', connectedAt: new Date() });
  
  socket.on("disconnect", () => {
    console.log(`🔄 Client disconnected: ${socket.id}`);
    connectedClients.delete(socket.id);
    
    if (socket.id === pythonSocket?.id) {
      console.log("⚠️ Python WebRTC server disconnected!");
      pythonSocket = null;
      
      // Notify all clients that Python server is disconnected
      io.emit("python-disconnected");
    }
  });
  
  socket.on("error", (error) => {
    console.error("❌ WebSocket Error:", error);
  });
  
  // Python server connection
  socket.on("connect-python", () => {
    pythonSocket = socket;
    connectedClients.set(socket.id, { type: 'python', connectedAt: new Date() });
    console.log(`🐍 Python WebRTC server connected! Socket ID: ${pythonSocket.id}`);
  });
  
  // Handle WebRTC offer from React client
  socket.on("webrtc-offer", (data) => {
    console.log("📡 Received SDP Offer from React, sending to Python...");
    
    // Check if Python server is connected
    if (pythonSocket) {
      // Forward offer with exercise type to Python
      pythonSocket.emit("webrtc-offer", data);
      connectedClients.set(socket.id, { 
        type: 'react', 
        exerciseType: data.exerciseType,
        connectedAt: connectedClients.get(socket.id)?.connectedAt || new Date()
      });
    } else {
      console.error("❌ Python server is not connected!");
      socket.emit("python-disconnected");
    }
  });
  
  // Handle WebRTC answer from Python
  socket.on("webrtc-answer", (data) => {
    console.log("📡 Received SDP Answer from Python, sending to React...");
    socket.broadcast.emit("webrtc-answer", data);
  });
  
  // Handle ICE candidate exchange
  socket.on("ice-candidate", (data) => {
    // console.log("📡 Forwarding ICE Candidate...");
    if (socket.id === pythonSocket?.id) {
      // From Python to React
      socket.broadcast.emit("ice-candidate", data);
    } else if (pythonSocket) {
      // From React to Python
      pythonSocket.emit("ice-candidate", data);
    } else {
      console.error("❌ Python socket is null, cannot forward ICE candidate!");
      socket.emit("python-disconnected");
    }
  });
  
  // Handle exercise type changes
  socket.on("exercise-change", (data) => {
    // console.log(`📊 Exercise type changed to: ${data.exerciseType}`);
    if (pythonSocket) {
      pythonSocket.emit("exercise-change", data);
      
      // Update client information
      const clientInfo = connectedClients.get(socket.id);
      if (clientInfo) {
        connectedClients.set(socket.id, {
          ...clientInfo,
          exerciseType: data.exerciseType
        });
      }
    }
  });
  
  // Handle exercise feedback from Python to React
  socket.on("exercise-feedback", (data) => {
    // console.log("📊 Received exercise feedback from Python, broadcasting to clients...");
    // Broadcast to all clients except the sender (Python)
    socket.broadcast.emit("exercise-feedback", data);
  });
  
  // Health check for clients
  socket.on("ping", () => {
    socket.emit("pong", { 
      pythonConnected: pythonSocket !== null,
      timestamp: Date.now()
    });
  });
});

// Start WebSocket server
server.listen(WEBSOCKET_PORT, () => {
  console.log(`🚀 WebSocket Server running on http://localhost:${WEBSOCKET_PORT}`);
});

// REST API server setup
import errorMiddleware from './middlewares/error.middleware.js';

app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
  next();
});

app.use(morgan('dev'));
app.use(cookieParser());

// Health check endpoint
app.get('/ping', (_req, res) => {
  res.json({
    status: 'ok',
    pythonConnected: pythonSocket !== null,
    clientsCount: connectedClients.size,
    timestamp: new Date().toISOString()
  });
});

// WebRTC status endpoint
app.get('/api/webrtc/status', (_req, res) => {
  res.json({
    pythonServerConnected: pythonSocket !== null,
    connectedClients: connectedClients.size,
    websocketServerRunning: true
  });
});

// Import all routes
import traineeRoutes from './routes/trainee.route.js';
import trainerRoutes from './routes/trainer.route.js';
import trainerRequest from './routes/trainerRequest.route.js';
import traineeRequestRoutes from './routes/traineeRequest.route.js';
import workoutRoute from "./routes/workout.route.js";
import workoutRouteTrainer from "./routes/workoutRouteTrainer.js";

// app.use("api/trainee",traineeRequestRoutes);
app.use('/api/trainee', traineeRoutes);
app.use('/api/trainer', trainerRoutes);


// Trainer Request Routes
app.use('/api/trainer/request', trainerRequest);
// User Request Routes


app.use('/api/trainee/request', traineeRequestRoutes);

app.use('/api/trainee/workout', workoutRoute);
app.use('/api/trainer/workout', workoutRouteTrainer);

// Default catch all route - 404
app.all('*', (_req, res) => {
  res.status(404).send('OOPS!!! 404 Page Not Found');
});

// Custom error handling middleware
app.use(errorMiddleware);

// Start the REST API server
app.listen(PORT, () => {
  console.log(`🚀 REST API Server running on http://localhost:${PORT}`);
});

export default app;