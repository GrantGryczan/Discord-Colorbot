import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

export default client;

client.login(process.env.TOKEN);
