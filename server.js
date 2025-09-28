
const WebSocket = require('ws');
const http = require('http');

// --- СЕРВЕРНЫЕ НАСТРОЙКИ ---
// Частота рассылки полного состояния мира (в миллисекундах).
// 66 мс = ~15 обновлений в секунду. Это оптимальный баланс между плавностью и нагрузкой.
const BROADCAST_INTERVAL_MS = 66; 

// Создаем HTTP сервер для совместимости с хостингами
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Survival Game Server is running.\n');
});

// Создаем WebSocket сервер
const wss = new WebSocket.Server({ 
    server: server,
    path: '/websocket' // Убедитесь, что путь совпадает с клиентским
});

// Хранилище игроков. Используем Map для удобного доступа по ID.
const players = new Map();
let nextPlayerId = 1;

console.log('🎮 Survival Game Server Started');

/**
 * Проверяет, занят ли никнейм (регистронезависимо).
 * @param {string} nickname - Никнейм для проверки.
 * @param {number} excludeId - ID игрока, который нужно исключить из проверки (сам себя).
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
    
    // Создаем объект игрока с начальными данными.
    const player = {
        id: id,
        ws: ws,
        x: Math.random() * 500 + 100, // Случайная позиция для спавна
        y: Math.random() * 500 + 100,
        rotation: 0,
        nickname: `Guest${id}`, // Временный никнейм до получения от клиента
        health: 100,
    };
    
    players.set(id, player);
    console.log(`[Connection] Player ${id} (${player.nickname}) connected.`);
    
    // --- ИНИЦИАЛИЗАЦИЯ НОВОГО ИГРОКА ---
    // Сразу отправляем 'init' сообщение. Клиент, получив его, должен будет отправить 'set_nickname'.
    const otherPlayers = Array.from(players.values())
        .filter(p => p.id !== id)
        .map(p => ({ id: p.id, x: p.x, y: p.y, rotation: p.rotation, nickname: p.nickname, health: p.health }));
        
    ws.send(JSON.stringify({
        type: 'init',
        playerId: id,
        players: otherPlayers
    }));
    
    // --- ОБРАБОТКА СООБЩЕНИЙ ---
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            const player = players.get(id);
            if (!player) return; // Если игрок уже отключился

            switch (message.type) {
                // ОБНОВЛЕНИЕ ДВИЖЕНИЯ
                // Это сообщение только обновляет состояние на сервере. Рассылка происходит в главном цикле.
                case 'move':
                    player.x = message.x;
                    player.y = message.y;
                    player.rotation = message.rotation || 0;
                    break;

                // УСТАНОВКА НИКНЕЙМА (АВТОРИТЕТНАЯ)
                case 'set_nickname': {
                    const requestedNickname = String(message.nickname || '').trim();
                    
                    // 1. Валидация
                    if (requestedNickname.length === 0 || requestedNickname.length > 16) {
                        // Можно отправить ошибку, но для простоты просто игнорируем
                        return; 
                    }

                    let finalNickname = requestedNickname;
                    let counter = 1;
                    
                    // 2. Проверка уникальности и генерация нового, если занят
                    while (isNicknameTaken(finalNickname, id)) {
                        finalNickname = `${requestedNickname}_${counter}`;
                        counter++;
                    }
                    
                    const oldNickname = player.nickname;
                    player.nickname = finalNickname;
                    
                    console.log(`[Nickname] Player ${id} changed name from "${oldNickname}" to "${finalNickname}"`);

                    // 3. Рассылка: сообщаем ВСЕМ (включая самого игрока) об утвержденном никнейме
                    broadcast(JSON.stringify({
                        type: 'nickname_updated',
                        playerId: id,
                        nickname: finalNickname
                    }));

                    // Если это первая установка ника, сообщаем всем о присоединении игрока с правильным ником
                    if (oldNickname.startsWith('Guest')) {
                        broadcast(JSON.stringify({
                            type: 'player_joined',
                            player: { id: player.id, x: player.x, y: player.y, rotation: player.rotation, nickname: player.nickname, health: player.health }
                        }), id); // Рассылаем всем, кроме самого себя
                    }
                    break;
                }
                
                // PING/PONG для поддержания соединения
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
            }
        } catch (error) {
            console.error(`[Error] Failed to process message from player ${id}:`, error);
        }
    });
    
    // --- ОТКЛЮЧЕНИЕ ИГРОКА ---
    ws.on('close', () => {
        const player = players.get(id);
        if (player) {
            console.log(`[Disconnection] Player ${id} (${player.nickname}) disconnected.`);
            players.delete(id);
            
            // Сообщаем всем, что игрок покинул игру
            broadcast(JSON.stringify({ 
                type: 'player_left', 
                playerId: id 
            }));
        }
    });
});

/**
 * Рассылает сообщение всем подключенным и активным клиентам.
 * @param {string} data - JSON-строка для отправки.
 * @param {number|null} excludeId - ID игрока, которого нужно исключить из рассылки.
 */
function broadcast(data, excludeId = null) {
    players.forEach((player) => {
        if (player.id !== excludeId && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(data);
        }
    });
}

// --- ГЛАВНЫЙ СЕРВЕРНЫЙ ЦИКЛ ---
// Этот цикл - сердце новой системы. Он обеспечивает постоянную и надежную синхронизацию.
setInterval(() => {
    if (players.size === 0) return;

    // Собираем актуальное состояние всех игроков
    const playersState = Array.from(players.values()).map(p => ({
        id: p.id,
        x: p.x,
        y: p.y,
        rotation: p.rotation,
        nickname: p.nickname,
        health: p.health
    }));

    // Создаем пакет для обновления
    const updatePacket = JSON.stringify({
        type: 'players_update',
        players: playersState
    });

    // Рассылаем всем
    broadcast(updatePacket);
}, BROADCAST_INTERVAL_MS);


// Запускаем сервер
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server is listening on port ${PORT}`);
});
