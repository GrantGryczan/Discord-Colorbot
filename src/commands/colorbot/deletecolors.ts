import type { BaseMessageOptions, ChatInputCommandInteraction } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import interactions from '../../modular-interactions';
import { isColorRole } from '../../color-roles';
import { roleManagementErrors } from '../../errors';

const UNKNOWN_ROLE = 10011;

const confirmButton = interactions.add({
	data: new ButtonBuilder()
		.setCustomId('deletecolors-confirm')
		.setLabel('Yes, delete all color roles.')
		.setStyle(ButtonStyle.Danger),
	click: async interaction => {
		const setMessage = async (options: BaseMessageOptions) => {
			if (interaction.replied) {
				interaction.editReply(options);
			} else {
				await interaction.update({
					...options,
					components: []
				});
			}
		};

		const colorRoles = interaction.guild.roles.cache.filter(isColorRole);
		let deletedColorRoleCount = 0;

		let errorMessageOptions: BaseMessageOptions | undefined;
		const setErrorMessageOptions = (options: BaseMessageOptions) => {
			errorMessageOptions = options;
		};

		colorRoles.map(async colorRole => {
			await colorRole.delete(`${interaction.user} used \`/colorbot deletecolors\`.`)
				.catch(async error => {
					// If the role is already missing, it might as well be considered a successful deletion.
					if (error.code !== UNKNOWN_ROLE) {
						throw error;
					}
				})
				.catch(roleManagementErrors(interaction, colorRole, setErrorMessageOptions));

			deletedColorRoleCount++;
		});

		const updateMessage = async () => {
			// To avoid race conditions, only ever update the follow-up message in here.

			if (errorMessageOptions) {
				await setMessage(errorMessageOptions);
				return;
			}

			if (deletedColorRoleCount === colorRoles.size) {
				await setMessage({
					content: `Deleted all ${colorRoles.size} color roles.`
				});
				return;
			}

			await setMessage({
				content: `Deleting color roles... (${deletedColorRoleCount} of ${colorRoles.size})`
			});

			setTimeout(updateMessage, 1000);
		};
		updateMessage();
	}
});

const cancelButton = interactions.add({
	data: new ButtonBuilder()
		.setCustomId('deletecolors-cancel')
		.setLabel('No, never mind.')
		.setStyle(ButtonStyle.Secondary),
	click: async interaction => {
		await interaction.update({
			content: 'Cancelled.',
			components: []
		});
	}
});

const deleteColors = (interaction: ChatInputCommandInteraction<'cached'>) => {
	const colorRoleCount = interaction.guild.roles.cache.filter(isColorRole).size;

	if (colorRoleCount === 0) {
		return interaction.reply({
			content: '**Error:** This server has no color roles.',
			ephemeral: true
		});
	}

	return interaction.reply({
		content: `Are you sure you want to delete all ${colorRoleCount} of this server's color roles?\nThis cannot be undone.`,
		components: [
			new ActionRowBuilder<ButtonBuilder>()
				.addComponents(confirmButton, cancelButton)
		],
		ephemeral: true
	});
};

export default deleteColors;
