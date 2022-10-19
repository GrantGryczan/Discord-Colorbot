import type { Message, BaseMessageOptions, ChatInputCommandInteraction } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import interactions from '../../../lib/interactions';
import { isColorRole } from '../../color-roles';
import { roleManagementErrors } from '../../errors';

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
				content: `Deleting color roles... (${deletedColorRoleCount} of ${colorRoles.size})`
			});

			setTimeout(updateReply, 1000);
		};
		updateReply();

		Promise.all(
			colorRoles.map(async colorRole => {
				// TODO: Actually delete the role.
				await new Promise<void>((resolve, reject) => {
					setTimeout(() => {
						if (Math.random() < 0.002) {
							reject({ code: 50001 });
						} else {
							resolve();
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

const purge = (interaction: ChatInputCommandInteraction<'cached'>) => (
	interaction.reply({
		content: 'Are you sure you want to delete all of this server\'s color roles?\nThis cannot be undone.',
		components: [
			new ActionRowBuilder<ButtonBuilder>()
				.addComponents(purgeConfirmButton, purgeCancelButton)
		],
		ephemeral: true
	})
);

export default purge;
