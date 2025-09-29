// A simple WebSocket server designed to run behind a reverse proxy like Nginx.
// To run this: npm install ws uuid
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3000;

// Since Nginx is handling HTTP/HTTPS and path routing,
// we only need to create a pure WebSocket server.
const wss = new WebSocket.Server({ port: PORT });

// Game State
const players = {}; // Stores all connected player data: { id: { id, nickname, x, y, rotation, health } }

// Broadcast a message to all connected clients
const broadcast = (message) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
};

wss.on('connection', (ws) => {
    const playerId = uuidv4();
    ws.id = playerId;

    console.log(`Player connected with ID: ${playerId}`);

    // Initialize player state
    players[playerId] = {
        id: playerId,
        nickname: `Guest-${playerId.substring(0, 4)}`,
        x: Math.random() * 200,
        y: Math.random() * 200,
        rotation: 0,
        health: 100,
    };

    // 1. Send initialization data to the new player.
    // This includes their own ID and the state of all *other* players.
    const otherPlayers = Object.values(players).filter(p => p.id !== playerId);
    ws.send(JSON.stringify({
        type: 'init',
        playerId: playerId,
        players: otherPlayers
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const player = players[ws.id];
            if (!player) return;

            switch (data.type) {
                case 'set_nickname':
                    // Sanitize nickname: trim, max length 16 chars
                    const newNickname = String(data.nickname || '').trim().substring(0, 16);
                    if (newNickname) {
                        console.log(`Player ${player.id} changed nickname to ${newNickname}`);
                        player.nickname = newNickname;
                        // Confirm the nickname back to the player
                        ws.send(JSON.stringify({
                            type: 'nickname_updated',
                            playerId: player.id,
                            nickname: player.nickname
                        }));
                    }
                    break;

                case 'move':
                    player.x = data.x;
                    player.y = data.y;
                    player.rotation = data.rotation;
                    break;

                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
            }
        } catch (error) {
            console.error(`Failed to process message from ${ws.id}:`, error);
        }
    });

    ws.on('close', () => {
        console.log(`Player disconnected: ${ws.id}`);
        delete players[ws.id];
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for player ${ws.id}:`, error);
        // The 'close' event will be fired after an error, so no need to delete player here.
    });
});

// Update game state and broadcast to all clients periodically
setInterval(() => {
    if (wss.clients.size > 0) {
        const playersArray = Object.values(players);
        broadcast({
            type: 'players_update',
            players: playersArray
        });
    }
}, 100); // Broadcast state 10 times per second

console.log(`WebSocket server is listening on port ${PORT}`);
console.log(`It expects to be proxied from a path like /websocket`);