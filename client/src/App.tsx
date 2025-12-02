import React, { useState, useEffect, useRef, FormEvent } from "react";
import io from "socket.io-client";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import type {
    SocketType,
    SessionState,
    VideoChangedData,
    PlayPauseSeekData,
    TimeSyncData,
} from "./types/socket";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "https://shared-watch-session.onrender.com/";

function App() {
    const [socket, setSocket] = useState<SocketType | null>(null);
    const [videoUrl, setVideoUrl] = useState<string>("");
    const [videoId, setVideoId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [userCount, setUserCount] = useState<number>(0);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const playerRef = useRef<YouTubePlayer | null>(null);
    const isSyncingRef = useRef<boolean>(false);
    const lastSyncTimeRef = useRef<number>(0);

    // Extract YouTube video ID from URL
    const extractVideoId = (url: string): string | null => {
        if (!url) return null;
        const regExp =
            /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return match && match[2].length === 11 ? match[2] : null;
    };

    // Initialize socket connection
    useEffect(() => {
        const newSocket: SocketType = io(SOCKET_URL);
        setSocket(newSocket);

        newSocket.on("connect", () => {
            console.log("[App] : Connected to server");
            setIsConnected(true);
        });

        newSocket.on("disconnect", () => {
            console.log("[App] : Disconnected from server");
            setIsConnected(false);
        });

        // Receive initial session state
        newSocket.on("sessionState", (data: SessionState) => {
            console.log("[App] : Received session state:", data);
            if (data.videoUrl) {
                const id = extractVideoId(data.videoUrl);
                if (id) {
                    setVideoId(id);
                    setVideoUrl(data.videoUrl);
                    setIsPlaying(data.isPlaying);

                    // Sync player to server time after a short delay
                    setTimeout(() => {
                        if (playerRef.current) {
                            isSyncingRef.current = true;
                            playerRef.current.seekTo(data.currentTime, true);
                            if (data.isPlaying) {
                                playerRef.current.playVideo();
                            } else {
                                playerRef.current.pauseVideo();
                            }
                            setTimeout(() => {
                                isSyncingRef.current = false;
                            }, 500);
                        }
                    }, 1000);
                }
            }
        });

        // Handle video change from other users
        newSocket.on("videoChanged", (data: VideoChangedData) => {
            console.log("[App] : Video changed:", data.videoUrl);
            const id = extractVideoId(data.videoUrl);
            if (id) {
                setVideoId(id);
                setVideoUrl(data.videoUrl);
                setIsPlaying(false);
            }
        });

        // Handle play action from other users
        newSocket.on("play", (data: PlayPauseSeekData) => {
            console.log("[App] : Received play:", data);
            if (playerRef.current && !isSyncingRef.current) {
                isSyncingRef.current = true;
                setIsPlaying(true);
                const timeDiff = Math.abs(
                    playerRef.current.getCurrentTime() - data.currentTime
                );

                // If time difference is significant, seek first
                if (timeDiff > 1) {
                    playerRef.current.seekTo(data.currentTime, true);
                }

                playerRef.current.playVideo();
                setTimeout(() => {
                    isSyncingRef.current = false;
                }, 500);
            }
        });

        // Handle pause action from other users
        newSocket.on("pause", (data: PlayPauseSeekData) => {
            console.log("[App] : Received pause:", data);
            if (playerRef.current && !isSyncingRef.current) {
                isSyncingRef.current = true;
                setIsPlaying(false);
                const timeDiff = Math.abs(
                    playerRef.current.getCurrentTime() - data.currentTime
                );

                // If time difference is significant, seek first
                if (timeDiff > 1) {
                    playerRef.current.seekTo(data.currentTime, true);
                }

                playerRef.current.pauseVideo();
                setTimeout(() => {
                    isSyncingRef.current = false;
                }, 500);
            }
        });

        // Handle seek action from other users
        newSocket.on("seek", (data: PlayPauseSeekData) => {
            console.log("[App] : Received seek:", data);
            if (playerRef.current && !isSyncingRef.current) {
                isSyncingRef.current = true;
                playerRef.current.seekTo(data.currentTime, true);
                setTimeout(() => {
                    isSyncingRef.current = false;
                }, 500);
            }
        });

        // Handle time sync from server
        newSocket.on("timeSync", (data: TimeSyncData) => {
            if (playerRef.current && !isSyncingRef.current && isPlaying) {
                const currentTime = playerRef.current.getCurrentTime();
                const timeDiff = Math.abs(currentTime - data.currentTime);

                // Only sync if drift is significant (> 2 seconds)
                if (timeDiff > 2) {
                    isSyncingRef.current = true;
                    playerRef.current.seekTo(data.currentTime, true);
                    setTimeout(() => {
                        isSyncingRef.current = false;
                    }, 500);
                }
            }
        });

        // Handle user count updates
        newSocket.on("userCount", (count: number) => {
            setUserCount(count);
        });

        return () => {
            newSocket.close();
        };
    }, []);

    // Handle video URL input
    const handleVideoSubmit = (e: FormEvent<HTMLFormElement>): void => {
        e.preventDefault();
        const id = extractVideoId(videoUrl);
        if (id && socket) {
            setVideoId(id);
            socket.emit("changeVideo", { videoUrl });
        } else {
            alert("Please enter a valid YouTube URL");
        }
    };

    // YouTube player options
    const opts = {
        height: "390",
        width: "100%",
        playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
        },
    };

    // Handle player ready
    const handleReady = (event: YouTubeEvent): void => {
        playerRef.current = event.target;
    };

    // Handle play event
    const handlePlay = (): void => {
        if (socket && !isSyncingRef.current && playerRef.current) {
            const currentTime = playerRef.current.getCurrentTime();
            socket.emit("play", { currentTime });
            setIsPlaying(true);
        }
    };

    // Handle pause event
    const handlePause = (): void => {
        if (socket && !isSyncingRef.current && playerRef.current) {
            const currentTime = playerRef.current.getCurrentTime();
            socket.emit("pause", { currentTime });
            setIsPlaying(false);
        }
    };

    // Track time to detect seeks
    useEffect(() => {
        if (!playerRef.current || !socket) return;

        let lastCheckedTime = lastSyncTimeRef.current;

        const checkSeek = setInterval(() => {
            if (playerRef.current && !isSyncingRef.current) {
                const currentTime = playerRef.current.getCurrentTime();

                if (isPlaying) {
                    // When playing, detect if time jumped significantly (more than 2 seconds difference)
                    const timeDiff = Math.abs(currentTime - lastCheckedTime);
                    // Normal playback should advance by ~0.5s (check interval), allow some buffer
                    if (timeDiff > 2.5) {
                        // Significant jump detected - this is a seek
                        socket.emit("seek", { currentTime });
                        lastSyncTimeRef.current = currentTime;
                        lastCheckedTime = currentTime;
                    } else {
                        lastCheckedTime = currentTime;
                        lastSyncTimeRef.current = currentTime;
                    }
                } else {
                    // When paused, any time change is a seek
                    if (Math.abs(currentTime - lastCheckedTime) > 0.1) {
                        socket.emit("seek", { currentTime });
                        lastSyncTimeRef.current = currentTime;
                        lastCheckedTime = currentTime;
                    }
                }
            }
        }, 500); // Check every 500ms

        return () => clearInterval(checkSeek);
    }, [socket, isPlaying]);

    // Handle state changes (for detecting when video starts after seek)
    const handleStateChange = (event: YouTubeEvent): void => {
        // Update last sync time when playback starts
        if (event.data === YouTube.PlayerState.PLAYING && playerRef.current) {
            lastSyncTimeRef.current = playerRef.current.getCurrentTime();
        }
    };

    // Periodic time update to server
    useEffect(() => {
        if (!socket || !playerRef.current || !isPlaying) return;

        const interval = setInterval(() => {
            if (playerRef.current && !isSyncingRef.current) {
                const currentTime = playerRef.current.getCurrentTime();
                socket.emit("timeUpdate", { currentTime });
                lastSyncTimeRef.current = currentTime;
            }
        }, 2000); // Update every 2 seconds

        return () => clearInterval(interval);
    }, [socket, isPlaying]);

    return (
        <div className="min-h-screen flex justify-center items-start p-5 bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600">
            <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
                <header className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-6 px-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-semibold mb-4">
                        🎬 Shared Watch Session
                    </h1>
                    <div className="flex justify-center items-center gap-6 flex-wrap">
                        <div
                            className={`flex items-center gap-2 text-sm py-1.5 px-3 rounded-full bg-white/20 ${
                                isConnected ? "" : ""
                            }`}
                        >
                            <span
                                className={`w-2 h-2 rounded-full ${
                                    isConnected
                                        ? "bg-green-400 animate-pulse"
                                        : "bg-red-500 animate-pulse"
                                }`}
                            ></span>
                            {isConnected ? "Connected" : "Disconnected"}
                        </div>
                        <div className="text-sm py-1.5 px-3 rounded-full bg-white/20">
                            👥 {userCount} {userCount === 1 ? "user" : "users"}{" "}
                            watching
                        </div>
                    </div>
                </header>

                <div className="p-8">
                    <form
                        onSubmit={handleVideoSubmit}
                        className="flex gap-3 mb-6 flex-col md:flex-row"
                    >
                        <input
                            type="text"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="Enter YouTube URL..."
                            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-base transition-colors focus:outline-none focus:border-indigo-500"
                        />
                        <button
                            type="submit"
                            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-base font-semibold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                        >
                            Load Video
                        </button>
                    </form>

                    {videoId && (
                        <div className="w-full relative pb-[56.25%] h-0 overflow-hidden rounded-xl shadow-lg bg-black">
                            <YouTube
                                videoId={videoId}
                                opts={opts}
                                onReady={handleReady}
                                onPlay={handlePlay}
                                onPause={handlePause}
                                onStateChange={handleStateChange}
                                className="absolute top-0 left-0 w-full h-full"
                            />
                        </div>
                    )}

                    {!videoId && (
                        <div className="text-center py-16 px-5 text-gray-600 text-lg">
                            <p>
                                Enter a YouTube URL above to start watching
                                together!
                            </p>
                        </div>
                    )}
                </div>

                <footer className="py-5 px-8 bg-gray-100 text-center text-gray-600 text-sm border-t border-gray-300">
                    <p>
                        All users watch the same video in sync. Play, pause, or
                        seek to control playback for everyone.
                    </p>
                </footer>
            </div>
        </div>
    );
}

export default App;
