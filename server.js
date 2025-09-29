// Final, clean WebSocket server designed to run behind a reverse proxy like Nginx.
// To run this: npm install ws uuid
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3000;

// Since Nginx is handling HTTP/HTTPS and path routing,
// we only need to create a pure WebSocket server on the specified port.
const wss = new WebSocket.Server({ port: PORT });

// --- Game State ---
const players = {}; // Stores all connected player data

/**
 * Broadcasts a message to all connected and ready clients.
 * @param {object} message The message object to send.
 */
const broadcast = (message) => {
    const serializedMessage = JSON.stringify(message);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(serializedMessage);
        }
    });
};

wss.on('connection', (ws) => {
    // A new player has connected. Assign a unique ID.
    const playerId = uuidv4();
    ws.id = playerId;

    console.log(`[+] Player connected. Assigned ID: ${playerId}`);

    // Initialize the player's state on the server.
    players[playerId] = {
        id: playerId,
        nickname: `Guest-${playerId.substring(0, 4)}`,
        x: Math.random() * 200 - 100, // Start near the center
        y: Math.random() * 200 - 100,
        rotation: 0,
        health: 100,
    };

    // Send an 'init' message to the newly connected client.
    // This tells them their ID and gives them the current state of all other players.
    const otherPlayers = Object.values(players).filter(p => p.id !== playerId);
    const initMessage = {
        type: 'init',
        playerId: playerId,
        players: otherPlayers
    };
    ws.send(JSON.stringify(initMessage));
    console.log(`[>] Sent 'init' to ${playerId}`);

    // Set up message handling for this specific client.
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const player = players[ws.id];
            if (!player) return; // Ignore messages from non-existent players

            switch (data.type) {
                case 'set_nickname':
                    // Sanitize nickname: trim whitespace, max length 16 chars
                    const newNickname = String(data.nickname || '').trim().substring(0, 16);
                    if (newNickname) {
                        console.log(`[*] Player ${player.id} changed nickname to: ${newNickname}`);
                        player.nickname = newNickname;
                        // Confirm the nickname change back to the player
                        ws.send(JSON.stringify({
                            type: 'nickname_updated',
                            playerId: player.id,
                            nickname: player.nickname
                        }));
                    }
                    break;

                case 'move':
                    // Update player position and rotation from client data.
                    player.x = data.x;
                    player.y = data.y;
                    player.rotation = data.rotation;
                    break;

                case 'ping':
                    // Respond to client's ping to keep connection alive.
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
            }
        } catch (error) {
            console.error(`[!] Failed to process message from ${ws.id}:`, error);
        }
    });

    ws.on('close', () => {
        console.log(`[-] Player disconnected: ${ws.id}`);
        // Remove the player from the game state when they disconnect.
        delete players[ws.id];
    });

    ws.on('error', (error) => {
        console.error(`[!] WebSocket error for player ${ws.id}:`, error);
    });
});

// This loop periodically sends the complete state of all players to all clients.
setInterval(() => {
    if (wss.clients.size > 0) {
        const playersArray = Object.values(players);
        broadcast({
            type: 'players_update',
            players: playersArray
        });
    }
}, 100); // Broadcast state 10 times per second for smooth updates.

console.log(`✅ WebSocket server started successfully on port ${PORT}.`);
console.log(`   Waiting for connections proxied from Nginx...`);
