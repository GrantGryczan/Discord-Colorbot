import dotenv from 'dotenv';
dotenv.config();

import './commands/color';
import './commands/colorbot';

import { Client, GatewayIntentBits } from 'discord.js';
import interactions from './modular-interactions';
import { isColorRole } from './color-roles';
import { roleManagementErrors } from './errors';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once('ready', async () => {
	await Promise.all(
		client.guilds.cache.map(async guild => {
			// Cache all guild members so roles' member counts are accurate.
			// Discord.js will keep members updated automatically from now on.
			await guild.members.fetch();

			// Delete all unused hex color roles.
			await Promise.all([
				guild.roles.cache
					.filter(role => isColorRole(role) && role.members.size === 0)
					.map(role => role.delete('This role is now unused.'))
			]).catch(roleManagementErrors({ guild }));
		})
	);

	await interactions.initialize(client);

	console.log('Ready!');
});

client.login(process.env.TOKEN);
