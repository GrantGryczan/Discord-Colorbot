import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import interactions from '../../lib/interactions';

const purgeConfirmButton = interactions.add({
	data: new ButtonBuilder()
		.setCustomId('purge-confirm')
		.setLabel('Yes, delete all color roles.')
		.setStyle(ButtonStyle.Danger),
	click: async interaction => {
		await interaction.deferUpdate();
		await interaction.deferReply();

		// TODO: Delete all color roles.

		await interaction.update({ components: [] });

		await interaction.reply({
			content: 'Testing...',
			ephemeral: true
		});
	}
});

const purgeCancelButton = interactions.add({
	data: new ButtonBuilder()
		.setCustomId('purge-cancel')
		.setLabel('No, never mind.')
		.setStyle(ButtonStyle.Secondary),
	click: async interaction => {
		await interaction.update({ components: [] });

		await interaction.reply({
			content: 'Color role purge cancelled.',
			ephemeral: true
		});
	}
});

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
			return interaction.reply({
				content: 'Are you sure you want to delete all of this server\'s color roles?\nThis cannot be undone.',
				components: [
					new ActionRowBuilder<ButtonBuilder>()
						.addComponents(purgeConfirmButton, purgeCancelButton)
				],
				ephemeral: true
			});
		}

		return interaction.reply({
			content: 'Unknown subcommand.',
			ephemeral: true
		});
	}
});
