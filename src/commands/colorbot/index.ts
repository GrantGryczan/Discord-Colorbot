import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import interactions from '../../../lib/interactions';
import purge from './purge';

interactions.add({
	data: new SlashCommandBuilder()
		.setName('colorbot')
		.setDescription('Manage Colorbot')
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.addSubcommand(subcommand => (
			subcommand
				.setName('purge')
				.setDescription('Permanently deletes all of this server\'s color roles')
		)),
	execute: async interaction => {
		const subcommand = interaction.options.getSubcommand();

		if (subcommand === 'purge') {
			return purge(interaction);
		}

		return interaction.reply({
			content: 'Unknown subcommand.',
			ephemeral: true
		});
	}
});
