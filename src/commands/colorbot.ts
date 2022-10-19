import type { Message, BaseMessageOptions } from 'discord.js';
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

		let followUp: Message<true> | undefined;
		const setFollowUp = async (options: BaseMessageOptions) => {
			if (!followUp) {
				followUp = await interaction.followUp({
					...options,
					ephemeral: true
				});
				return;
			}

			return followUp.edit(options);
		};

		const colorRoles = interaction.guild.roles.cache.filter(isColorRole);
		let deletedColorRoleCount = 0;

		let errorReplyOptions: BaseMessageOptions | undefined;
		const setErrorReplyOptions = (options: BaseMessageOptions) => {
			errorReplyOptions = options;
		};

		const updateReply = async () => {
			if (errorReplyOptions) {
				// TODO: Display a more specific error.
				await setFollowUp(errorReplyOptions);
				return;
			}

			if (deletedColorRoleCount === colorRoles.size) {
				await setFollowUp({
					content: `Deleted ${colorRoles.size} color roles.`
				});
				return;
			}

			await setFollowUp({
				content: `Deleting ${deletedColorRoleCount}/${colorRoles.size} color roles...`
			});

			setTimeout(updateReply, 1000);
		};
		setTimeout(updateReply, 500);

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
