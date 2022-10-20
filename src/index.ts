import dotenv from 'dotenv';
dotenv.config();

import './commands/color';
import './commands/colorbot';

import { Client, GatewayIntentBits } from 'discord.js';
import interactions from './modular-interactions';
import { isColorRole } from './color-roles';
import { roleManagementErrors } from './errors';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.on('error', console.error);

client.once('ready', async () => {
	await Promise.all(
		client.guilds.cache.map(async guild => {
			// Cache all guild members so roles' member counts are accurate.
			// Discord.js will keep members updated automatically from now on.
			await guild.members.fetch();

			// Delete all unused color roles.
			// Don't await any of this because that would allow DOS. Mass role deletion is very slow.
			const antiSpamKey = {};
			for (const role of guild.roles.cache.values()) {
				if (isColorRole(role) && role.members.size === 0) {
					role.delete('This role is now unused.')
						.catch(roleManagementErrors({ role, antiSpamKey }));
				}
			}
		})
	);

	await interactions.initialize(client);

	console.log('Ready!');
});

client.login(process.env.TOKEN);
