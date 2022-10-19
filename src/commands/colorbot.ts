import type { InteractionReplyOptions } from 'discord.js';
import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import interactions from '../../lib/interactions';
import { isColorRole } from '../color-roles';
import { roleManagementErrors } from '../errors';

const purgeConfirmButton = interactions.add({
	data: new ButtonBuilder()
		.setCustomId('purge-confirm')
		.setLabel('Yes, delete all color roles.')
		.setStyle(ButtonStyle.Danger),
	click: async interaction => {
		await interaction.update({ components: [] });

		let replied = false;
		const setReply = (options: InteractionReplyOptions) => {
			if (!replied) {
				replied = true;
				return interaction.followUp(options);
			}

			return interaction.editReply(options);
		};

		const colorRoles = interaction.guild.roles.cache.filter(isColorRole);
		let deletedColorRoleCount = 0;

		let errorReplyOptions: InteractionReplyOptions | undefined;
		const setErrorReplyOptions = (options: InteractionReplyOptions) => {
			errorReplyOptions = options;
		};

		Promise.all(
			colorRoles.map(async colorRole => {
				// TODO: Actually delete the role.
				await new Promise<void>(resolve => {
					setTimeout(() => {
						resolve();

						if (Math.random() < 0.002) {
							throw { code: 50001 } as any;
						}
					}, Math.random() * 5000);
				})
					.catch(roleManagementErrors(interaction, colorRole, setErrorReplyOptions));

				deletedColorRoleCount++;
			})
		);

		const updateReply = async () => {
			if (errorReplyOptions) {
				// TODO: Display a more specific error.
				await setReply(errorReplyOptions);
				return;
			}

			if (deletedColorRoleCount === colorRoles.size) {
				await setReply({
					content: `Deleted ${colorRoles.size} color roles.`
				});
				return;
			}

			await setReply({
				content: `Deleting ${deletedColorRoleCount}/${colorRoles.size} color roles...`,
				ephemeral: true
			});

			setTimeout(updateReply, 1000);
		};
		setTimeout(updateReply, 500);

		// TODO: Delete all color roles.

		done = true;
	}
});

const purgeCancelButton = interactions.add({
	data: new ButtonBuilder()
		.setCustomId('purge-cancel')
		.setLabel('No, never mind.')
		.setStyle(ButtonStyle.Secondary),
	click: async interaction => {
		await interaction.update({ components: [] });

		await interaction.followUp({
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
