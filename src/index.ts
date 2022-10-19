import dotenv from 'dotenv';
dotenv.config();

import { Client, GatewayIntentBits } from 'discord.js';
import interactions from '../lib/interactions';
import { isColorRole } from './color-roles';

import './commands/color';
import './commands/colorbot';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once('ready', async () => {
	interactions.initialize(client);

	await Promise.all(
		client.guilds.cache.map(async guild => {
			// Cache all guild members so roles' member counts are accurate.
			// Discord.js will keep members updated automatically from now on.
			await guild.members.fetch();

			// Delete all unused hex color roles.
			await Promise.all([
				guild.roles.cache
					.filter(role => isColorRole(role) && role.members.size === 0)
					// TODO: Catch errors.
					.map(role => role.delete('This role is now unused.'))
			]);
		})
	);

	console.log('Ready!');
});

client.login(process.env.TOKEN);
