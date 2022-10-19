import type { Message, BaseMessageOptions, ChatInputCommandInteraction } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import interactions from '../../../lib/interactions';
import { isColorRole } from '../../color-roles';
import { roleManagementErrors } from '../../errors';

const UNKNOWN_ROLE = 10011;

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

			return interaction.webhook.editMessage(followUp, options);
		};

		const colorRoles = interaction.guild.roles.cache.filter(isColorRole);
		let deletedColorRoleCount = 0;

		let errorReplyOptions: BaseMessageOptions | undefined;
		const setErrorReplyOptions = (options: BaseMessageOptions) => {
			errorReplyOptions = options;
		};

		colorRoles.map(async colorRole => {
			await colorRole.delete(`${interaction.user} used \`/colorbot purge\`.`)
				.catch(async error => {
					// If the role is already missing, it might as well be considered a successful deletion.
					if (error.code !== UNKNOWN_ROLE) {
						throw error;
					}
				})
				.catch(roleManagementErrors(interaction, colorRole, setErrorReplyOptions));

			deletedColorRoleCount++;
		});

		const updateReply = async () => {
			// To avoid race conditions, only ever update the follow-up message in here.

			if (errorReplyOptions) {
				await setFollowUp(errorReplyOptions);
				return;
			}

			if (deletedColorRoleCount === colorRoles.size) {
				await setFollowUp({
					content: 'Deleted all color roles.'
				});
				return;
			}

			await setFollowUp({
				content: `Deleting color roles... (${deletedColorRoleCount} of ${colorRoles.size})`
			});

			setTimeout(updateReply, 1000);
		};
		updateReply();
	}
});

const purgeCancelButton = interactions.add({
	data: new ButtonBuilder()
		.setCustomId('purge-cancel')
		.setLabel('No, never mind.')
		.setStyle(ButtonStyle.Secondary),
	click: async interaction => {
		await interaction.update({
			content: 'Color role purge cancelled.',
			components: []
		});
	}
});

const purge = (interaction: ChatInputCommandInteraction<'cached'>) => {
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
				.addComponents(purgeConfirmButton, purgeCancelButton)
		],
		ephemeral: true
	});
};

export default purge;
