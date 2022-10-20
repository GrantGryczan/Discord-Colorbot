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

			// Delete all unused color roles.
			// Don't await this because that would allow DOS by inviting the bot to servers with large amounts of unused color roles.
			const antiSpamKey = {};
			Promise.all(
				guild.roles.cache
					.filter(role => isColorRole(role) && role.members.size === 0)
					.map(colorRole => (
						colorRole.delete('This role is now unused.')
							.catch(roleManagementErrors({ role: colorRole, antiSpamKey }))
					))
			);
		})
	);

	await interactions.initialize(client);

	console.log('Ready!');
});

client.login(process.env.TOKEN);
