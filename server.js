const WebSocket = require('ws');
const http = require('http');

// --- СЕРВЕРНЫЕ НАСТРОЙКИ ---
// Частота рассылки полного состояния мира в миллисекундах.
// 100 мс = 10 обновлений в секунду.
const BROADCAST_INTERVAL_MS = 100;
const HEARTBEAT_INTERVAL_MS = 5000;

// Создаем HTTP сервер
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Survival Game Server is running.\n');
});

// Создаем WebSocket сервер
const wss = new WebSocket.Server({
    server: server,
    path: '/websocket'
});

const players = new Map();
let nextPlayerId = 1;

console.log('🎮 Survival Game Server Started');

/**
 * Проверяет, занят ли никнейм (регистронезависимо).
 * @param {string} nickname - Никнейм для проверки.
 * @param {number} excludeId - ID игрока, который нужно исключить из проверки.
 * @returns {boolean} True, если никнейм уже используется другим игроком.
 */
function isNicknameTaken(nickname, excludeId) {
    const lowerNick = nickname.toLowerCase();
    for (const player of players.values()) {
        if (player.id !== excludeId && player.nickname && player.nickname.toLowerCase() === lowerNick) {
            return true;
        }
    }
    return false;
}

wss.on('connection', (ws, req) => {
    const id = nextPlayerId++;
    ws.playerId = id; // Сохраняем ID игрока в объекте сокета для идентификации
    ws.isAlive = true; // Флаг для проверки активности соединения

    // Встроенный обработчик ответа на пинг (pong)
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    const player = {
        id: id,
        ws: ws,
        x: Math.random() * 500 + 100,
        y: Math.random() * 500 + 100,
        rotation: 0,
        nickname: `Guest${id}`,
        health: 100,
    };

    players.set(id, player);
    console.log(`[Connection] Player ${id} (${player.nickname}) connected.`);

    // 1. Отправляем новому игроку его ID и данные всех, кто уже в игре
    const otherPlayers = Array.from(players.values())
        .filter(p => p.id !== id)
        .map(p => ({ id: p.id, x: p.x, y: p.y, rotation: p.rotation, nickname: p.nickname, health: p.health }));

    ws.send(JSON.stringify({
        type: 'init',
        playerId: id,
        players: otherPlayers
    }));

    // 2. Сообщаем всем ОСТАЛЬНЫМ о новом игроке (через следующий broadcast)
    // Это предотвращает отправку лишнего сообщения, т.к. periodic broadcast справится
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            const player = players.get(id);
            if (!player) return;

            switch (message.type) {
                // ОБНОВЛЕНИЕ ДВИЖЕНИЯ
                case 'move': {
                    player.x = message.x;
                    player.y = message.y;
                    player.rotation = message.rotation || 0;
                    // Рассылка происходит в глобальном интервале, а не здесь
                    break;
                }

                // УСТАНОВКА НИКНЕЙМА
                case 'set_nickname': {
                    const requestedNickname = String(message.nickname || '').trim();
                    if (requestedNickname.length === 0 || requestedNickname.length > 16) return;

                    let finalNickname = requestedNickname;
                    let counter = 1;
                    while (isNicknameTaken(finalNickname, id)) {
                        finalNickname = `${requestedNickname}_${counter++}`;
                    }
                    
                    player.nickname = finalNickname;
                    console.log(`[Nickname] Player ${id} updated to "${finalNickname}"`);

                    // Отправляем подтверждение только этому игроку.
                    // Остальные получат новый ник через periodic broadcast.
                    ws.send(JSON.stringify({
                        type: 'nickname_updated',
                        playerId: id,
                        nickname: finalNickname
                    }));
                    break;
                }
                
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
            }
        } catch (error) {
            console.error(`[Error] processing message from player ${id}:`, error);
        }
    });

    ws.on('close', () => {
        const player = players.get(id);
        if (player) {
            console.log(`[Disconnection] Player ${id} (${player.nickname}) disconnected.`);
            players.delete(id);
            // Отправляем player_left для мгновенного удаления на клиентах
            broadcast(JSON.stringify({ type: 'player_left', playerId: id }));
        }
    });
});

// Глобальная рассылка для всех
function broadcast(data, excludeId = null) {
    players.forEach((player) => {
        if (player.id !== excludeId && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(data);
        }
    });
}

// --- Периодическая рассылка состояния мира ---
setInterval(() => {
    const playersData = Array.from(players.values()).map(p => ({
        id: p.id,
        x: p.x,
        y: p.y,
        rotation: p.rotation,
        nickname: p.nickname,
        health: p.health,
    }));

    if (playersData.length === 0) return;

    // Каждому игроку отправляем состояние всех остальных игроков
    players.forEach(player => {
        if (player.ws.readyState === WebSocket.OPEN) {
            const otherPlayers = playersData.filter(p => p.id !== player.id);
            player.ws.send(JSON.stringify({
                type: 'players_update',
                players: otherPlayers
            }));
        }
    });
}, BROADCAST_INTERVAL_MS);


// --- Проверка "мертвых" соединений (Heartbeat) ---
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.isAlive === false) {
            const player = players.get(ws.playerId);
            const playerName = player ? player.nickname : `ID ${ws.playerId}`;
            console.log(`[Heartbeat] No response from player ${playerName}. Terminating connection.`);
            return ws.terminate(); // Это вызовет событие 'close' на сервере
        }

        ws.isAlive = false; // Ожидаем pong в ответ на следующий пинг
        ws.ping(() => {});
    });
}, HEARTBEAT_INTERVAL_MS);

// Очистка интервала при закрытии сервера
wss.on('close', () => {
    clearInterval(heartbeatInterval);
});


// Запускаем сервер
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server is listening on port ${PORT}`);
});