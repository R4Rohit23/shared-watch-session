# Shared Watch Session

A real-time synchronized YouTube video watching application where multiple users can watch videos together in perfect sync.

## Features

- 🎬 **Shared Session**: One global session where all users automatically join
- 🎥 **YouTube Integration**: Play any YouTube video by entering its URL
- ⏯️ **Playback Controls**: Play, pause, and seek controls that sync across all users
- 🔄 **Real-time Synchronization**: All user actions (play, pause, seek, video change) are instantly synchronized
- 👥 **User Count**: See how many users are currently watching
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Architecture

### Backend
- **Node.js** with Express
- **Socket.io** for WebSocket-based real-time communication
- Global session state management
- Drift correction to maintain synchronization

### Frontend
- **React** with hooks
- **react-youtube** for YouTube player integration
- **Socket.io-client** for real-time communication
- Clean, modern UI with gradient design

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies for all packages:
```bash
npm run install-all
```

Or manually:
```bash
npm install
cd server && npm install
cd ../client && npm install
```

### Running the Application

Start both server and client simultaneously:
```bash
npm run dev
```

Or run them separately:

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## How It Works

1. **Connection**: When a user opens the app, they automatically connect to the global session via WebSocket
2. **Video Loading**: Any user can enter a YouTube URL to load a video for everyone
3. **Synchronization**: 
   - When a user plays/pauses/seeks, the action is sent to the server
   - The server broadcasts the action to all other users
   - Each client updates their player accordingly
4. **Drift Correction**: The server periodically checks and corrects time drift to maintain synchronization
5. **New User Sync**: When a new user joins, they receive the current video and playback state

## Technical Details

### Synchronization Strategy

- **Immediate Actions**: Play, pause, and seek actions are broadcast immediately
- **Time Sync**: Periodic time updates prevent drift between clients
- **Conflict Resolution**: Server maintains authoritative state; client actions are validated
- **Network Delay Handling**: Small time differences (< 2 seconds) are tolerated to prevent jitter

### State Management

The server maintains a global session state:
- Current video URL
- Playback state (playing/paused)
- Current playback time
- Last update timestamp
- Connected user count

## Project Structure

```
shared-watch-session/
├── server/
│   ├── server.js          # Express + Socket.io server
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── App.css        # Styles
│   │   ├── index.js       # Entry point
│   │   └── index.css      # Global styles
│   ├── public/
│   └── package.json
├── package.json           # Root package.json with scripts
└── README.md
```

## Environment Variables

You can configure the Socket.io server URL by setting:
```
REACT_APP_SOCKET_URL=http://localhost:3001
```

## Future Enhancements

Potential improvements:
- User names/identities
- Chat functionality
- Multiple rooms/sessions
- Playlist support
- Video queue system
- Admin controls

## License

MIT

