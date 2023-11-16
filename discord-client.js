// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits, Partials } = require('discord.js');
const { token } = require('./config.json');


function createClient() {
    // Create a new client instance
    const client = new Client({ intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages
        ],
        partials: [
            Partials.Channel,
            Partials.Message
        ]
        });

    // When the client is ready, run this code (only once)
    // We use 'c' for the event parameter to keep it separate from the already defined 'client'
    client.once(Events.ClientReady, c => {
        console.log(`Ready! Logged in as ${c.user.tag}`);
    });

    // Log in to Discord with your client's token
    client.login(token);
    return client;
}

async function sendMessageToUser(client, userId, messageContent) {
    try {
        // Fetch the user by their ID
        const user = await client.users.fetch(userId);

        // Send them a direct message
        await user.send(messageContent);
        console.log(`Message sent to ${user.tag}`);
    } catch (error) {
        console.error(`Failed to send message: ${error.message}`);
    }
}

module.exports = sendMessageToUser;

module.exports = createClient;