
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3000;

// Create a simple HTTP server. Nginx will proxy to this.
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Game WebSocket server is running. Please connect via WebSocket.');
});

// Attach the WebSocket server to the HTTP server.
// We don't specify a path, as Nginx has already handled routing /websocket to us.
const wss = new WebSocket.Server({ server });

// --- Game State ---
const players = {}; // Use an object for quick lookups by ID

// --- Game Loop ---
const UPDATE_RATE = 100; // Broadcast updates 10 times per second

setInterval(() => {
    const playersState = Object.values(players);
    if (playersState.length === 0) return;

    // The client expects 'players_update'
    const message = JSON.stringify({
        type: 'players_update',
        players: playersState,
    });

    // Broadcast to all connected clients
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}, UPDATE_RATE);

// Handle new connections
wss.on('connection', (ws, req) => {
    // Generate a unique ID for the new player
    const playerId = uuidv4();
    ws.id = playerId; // Attach the ID to the WebSocket object for easy access

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`[+] Player connected from ${ip}. Assigned ID: ${playerId}`);

    // Create a new player state object
    players[playerId] = {
        id: playerId,
        nickname: `Guest-${playerId.substring(0, 4)}`,
        x: Math.random() * 200 - 100,
        y: Math.random() * 200 - 100,
        rotation: 0,
        health: 100,
    };

    // Send the init message to the newly connected player
    // It contains their new ID and a list of all *other* players.
    const otherPlayers = Object.values(players).filter(p => p.id !== playerId);
    ws.send(JSON.stringify({
        type: 'init',
        playerId: playerId,
        players: otherPlayers,
    }));
    console.log(`[>] Sent 'init' to ${playerId} with ${otherPlayers.length} other players.`);

    // Handle messages from this specific player
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const player = players[ws.id];
            if (!player) return; // Ignore messages from players not in the state

            switch (data.type) {
                case 'set_nickname':
                    const newNickname = String(data.nickname || '').trim().substring(0, 16);
                    if (newNickname) {
                        player.nickname = newNickname;
                        console.log(`[*] Player ${player.id} is now known as: ${player.nickname}`);
                        // The client expects a confirmation
                        ws.send(JSON.stringify({
                            type: 'nickname_updated',
                            playerId: player.id,
                            nickname: player.nickname,
                        }));
                    }
                    break;

                case 'move':
                    // Update player state with data from the client
                    player.x = data.x;
                    player.y = data.y;
                    player.rotation = data.rotation;
                    break;

                case 'ping':
                    // The client is checking if the connection is alive
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
            }
        } catch (error) {
            console.error(`[!] Error processing message from ${ws.id}:`, error);
        }
    });

    // Handle player disconnection
    ws.on('close', () => {
        const disconnectedPlayer = players[ws.id];
        if (disconnectedPlayer) {
            console.log(`[-] Player disconnected: ${disconnectedPlayer.nickname} (${ws.id})`);
            delete players[ws.id]; // Remove player from the game state
        } else {
             console.log(`[-] A player disconnected, but was already removed. ID: ${ws.id}`);
        }
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
        console.error(`[!] WebSocket error for player ${ws.id}:`, error);
    });
});

// Start the HTTP server, which will also handle WebSocket upgrade requests
server.listen(PORT, () => {
    console.log(`✅ Game server listening on port ${PORT}. Ready for connections.`);
});
