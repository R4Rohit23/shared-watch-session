import express, { Express } from "express";
import { createServer, Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import type {
    SessionState,
    ChangeVideoData,
    PlayPauseSeekData,
    TimeUpdateData,
    SessionStateResponse,
    VideoChangedResponse,
    PlayPauseSeekResponse,
    TimeSyncResponse,
    SocketType,
} from "./types/socket.js";

const app: Express = express();
const httpServer: HttpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});

app.use(cors());
app.use(express.json());

// Global session state
const sessionState: SessionState = {
    videoUrl: null,
    isPlaying: false,
    currentTime: 0,
    lastUpdateTime: Date.now(),
    userCount: 0,
};

// Handle drift correction - periodically sync time
const DRIFT_CHECK_INTERVAL = 5000; // Check every 5 seconds
setInterval(() => {
    if (sessionState.isPlaying && sessionState.videoUrl) {
        // Calculate expected time based on elapsed time since last update
        const elapsed = (Date.now() - sessionState.lastUpdateTime) / 1000;
        sessionState.currentTime += elapsed;
        sessionState.lastUpdateTime = Date.now();

        // Broadcast time correction to all clients
        const timeSyncData: TimeSyncResponse = {
            currentTime: sessionState.currentTime,
            timestamp: Date.now(),
        };
        io.emit("timeSync", timeSyncData);
    }
}, DRIFT_CHECK_INTERVAL);

io.on("connection", (socket: SocketType) => {
    console.log("[Server] : User connected:", socket.id);
    sessionState.userCount++;

    // Send current session state to newly connected user
    const sessionStateResponse: SessionStateResponse = {
        videoUrl: sessionState.videoUrl,
        isPlaying: sessionState.isPlaying,
        currentTime: sessionState.currentTime,
        timestamp: Date.now(),
    };
    socket.emit("sessionState", sessionStateResponse);

    // Broadcast updated user count
    io.emit("userCount", sessionState.userCount);

    // Handle video URL change
    socket.on("changeVideo", (data: ChangeVideoData) => {
        const { videoUrl } = data;
        sessionState.videoUrl = videoUrl;
        sessionState.currentTime = 0;
        sessionState.isPlaying = false;
        sessionState.lastUpdateTime = Date.now();

        // Broadcast to all other users
        const videoChangedResponse: VideoChangedResponse = {
            videoUrl,
            timestamp: Date.now(),
        };
        socket.broadcast.emit("videoChanged", videoChangedResponse);

        console.log(`[Server] : Video changed to: ${videoUrl}`);
    });

    // Handle play action
    socket.on("play", (data: PlayPauseSeekData) => {
        const { currentTime } = data;
        sessionState.isPlaying = true;
        sessionState.currentTime = currentTime || sessionState.currentTime;
        sessionState.lastUpdateTime = Date.now();

        // Broadcast to all other users
        const playResponse: PlayPauseSeekResponse = {
            currentTime: sessionState.currentTime,
            timestamp: Date.now(),
        };
        socket.broadcast.emit("play", playResponse);

        console.log("[Server] : Play action:", sessionState.currentTime);
    });

    // Handle pause action
    socket.on("pause", (data: PlayPauseSeekData) => {
        const { currentTime } = data;
        sessionState.isPlaying = false;
        sessionState.currentTime = currentTime || sessionState.currentTime;
        sessionState.lastUpdateTime = Date.now();

        // Broadcast to all other users
        const pauseResponse: PlayPauseSeekResponse = {
            currentTime: sessionState.currentTime,
            timestamp: Date.now(),
        };
        socket.broadcast.emit("pause", pauseResponse);

        console.log("[Server] : Pause action:", sessionState.currentTime);
    });

    // Handle seek action
    socket.on("seek", (data: PlayPauseSeekData) => {
        const { currentTime } = data;
        sessionState.currentTime = currentTime;
        sessionState.lastUpdateTime = Date.now();

        // Broadcast to all other users
        const seekResponse: PlayPauseSeekResponse = {
            currentTime: sessionState.currentTime,
            timestamp: Date.now(),
        };
        socket.broadcast.emit("seek", seekResponse);

        console.log("[Server] : Seek action:", sessionState.currentTime);
    });

    // Handle time update (for periodic sync)
    socket.on("timeUpdate", (data: TimeUpdateData) => {
        const { currentTime } = data;
        // Only update if this is close to expected time (prevent malicious updates)
        const expectedTime = sessionState.isPlaying
            ? sessionState.currentTime +
              (Date.now() - sessionState.lastUpdateTime) / 1000
            : sessionState.currentTime;

        // Allow small drift (within 2 seconds)
        if (Math.abs(currentTime - expectedTime) < 2) {
            sessionState.currentTime = currentTime;
            sessionState.lastUpdateTime = Date.now();
        }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
        console.log("[Server] : User disconnected:", socket.id);
        sessionState.userCount--;
        io.emit("userCount", sessionState.userCount);
    });
});

const PORT: number = parseInt(process.env.PORT || "3001", 10);
httpServer.listen(PORT, () => {
    console.log(`[Server] : Server running on port ${PORT}`);
});
