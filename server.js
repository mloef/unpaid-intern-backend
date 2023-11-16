const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const WebSocket = require('ws');
const createClient = require('./discord-client');

const app = express();
const port = 3000;

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
let ws_clients = {};
let typing = {};
const TYPING_TIMEOUT = 10000;
const TYPING_DURATION = 120 * 1000;

// Create a new client instance
const discClient = createClient();

function keepTyping(user) {
    if (typing[user.id]) {
        console.log(`Keeping ${user.tag} typing`);
        user.dmChannel.sendTyping();
        setTimeout(() => keepTyping(user), TYPING_TIMEOUT);
    }
}

function timeoutTyping(user) {
    console.log(`Timeout ${user.tag} typing`);
    typing[user.id] = false;
}

discClient.on('messageCreate', async message => {
    const messageBody = message.content;
    const username = message.author.id;
    console.log('Got message', messageBody, 'from', username);

    if (ws_clients[username]) {
        const user = await discClient.users.fetch(username);
        if (typing[username]) {
            console.log(`clearing timeout for ${username}`);
            clearTimeout(typing[username]);
        }
        typing[username] = setTimeout(() => timeoutTyping(user), TYPING_DURATION);
        keepTyping(user);

        const socket = ws_clients[username];
        socket.send(JSON.stringify({ type: 'SEND_MESSAGE', body: messageBody }));
    } else {
        console.log(`No client found with ID: ${username}`);
    }
});

async function sendMessageInChunks(user, content) {
    const maxLength = 2000;  // Discord's maximum message length for regular messages
    let startIndex = 0;

    while (startIndex < content.length) {
        const messageChunk = content.substr(startIndex, maxLength);
        await user.send(messageChunk);
        startIndex += maxLength;
    }
}

app.use(bodyParser.json({
    verify: (req, _, buf) => {
        req.rawBody = buf.toString();
    }
}));

app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Basic Express Page</title>
      </head>
      <body>
          <h1>Welcome to the Basic Express Page</h1>
          <p>This is a simple HTML page served by Express.</p>
      </body>
      </html>
    `);
});

wss.on('connection', (ws) => {
    var clientId;
    ws.on('message', async (message) => {
        const parsedMessage = JSON.parse(message);
        if (parsedMessage.type === 'CLIENT_ID' && parsedMessage.id) {
            clientId = parsedMessage.id;
            ws_clients[clientId] = ws;

            console.log(`Client connected with ID: ${clientId}`);
            ws.send(JSON.stringify({ type: 'YOUR_ID', id: clientId }));
        } else if (parsedMessage.type === 'LLM_RESULT' && parsedMessage.body) {
            console.log(`Sending ${clientId}: ${parsedMessage.body}`);

            try {
                const user = await discClient.users.fetch(clientId);
                await sendMessageInChunks(user, parsedMessage.body);
                console.log(`Message sent to ${user.tag}`);
                keepTyping(user);
            } catch (error) {
                console.error(`Failed to send message: ${error.message}`);
            }
        } else if (parsedMessage.type === 'END_TYPING' && !parsedMessage.body) {
            console.log(`ending typing for ${clientId}`);
            clearTimeout(typing[clientId]);
            typing[clientId] = false;
        } else {
            console.log('Invalid message received from client:', parsedMessage);
        }
    });

    ws.onclose = (event) => {
        console.log('WebSocket closed with code:', event.code, 'and reason:', event.reason);
    };
});

server.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});