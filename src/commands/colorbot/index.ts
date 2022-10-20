import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import interactions from '../../modular-interactions';
import deleteColors from './deletecolors';

interactions.add({
	data: new SlashCommandBuilder()
		.setName('colorbot')
		.setDescription('Manage Colorbot.')
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.addSubcommand(subcommand => (
			subcommand
				.setName('deletecolors')
				.setDescription('Permanently delete all of this server\'s color roles.')
		)),
	execute: async interaction => {
		const subcommand = interaction.options.getSubcommand();

		if (subcommand === 'deletecolors') {
			return deleteColors(interaction);
		}

		return interaction.reply({
			content: '**Error:** Unknown subcommand.',
			ephemeral: true
		});
	}
});
