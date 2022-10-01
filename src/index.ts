import dotenv from 'dotenv';
dotenv.config();

import { Client, GatewayIntentBits } from 'discord.js';
import commands from '../lib/commands';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

commands.load(client);

client.once('ready', async () => {
	await Promise.all(
		// Cache all guild members so roles' member counts are accurate.
		// Discord.js will keep members updated automatically from now on.
		client.guilds.cache.map(guild => guild.members.fetch())
	);

	console.log('Ready!');
});

client.login(process.env.TOKEN);
