const WebSocket = require('ws');

const ws = new WebSocket('ws://52.33.88.92/ws/');

ws.onopen = () => {
    console.log('Connected to the server');
    ws.send(JSON.stringify({ type: 'CLIENT_ID', id: '+12345678' })); //TODO
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'YOUR_ID') {
        console.log('Your client ID:', data.id);
    } else if (data.type === 'SEND_MESSAGE') {
        console.log('Message for LLM:', data.body);
        const reversedMessage = data.body.split('').reverse().join('');
        ws.send(JSON.stringify({type: "SEND_MESSAGE", body: reversedMessage}));
    } else {
        console.log('Got unknown message:', event.data);
    }
};

ws.onerror = (error) => {
    console.error('WebSocket Error:', error);
};

ws.onclose = (event) => {
    console.log('WebSocket closed with code:', event.code, 'and reason:', event.reason);
};