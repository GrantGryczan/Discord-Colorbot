import type { ChatInputCommandInteraction, Role } from 'discord.js';

/**
 * Returns a promise rejection handler for when the bot needs the "Manage Roles" permission.
 *
 * If the handler catches an error, it replies to the specified interaction with an error message.
 *
 * A role argument must also be specified if this should catch errors caused by incorrect role positions.
 */
export const roleManagementErrors = (
	interaction: ChatInputCommandInteraction<'cached'>,
	role?: Role
) => async (error: any) => {
	if (error.message === 'Missing Access') {
		await interaction.reply({
			content: '**Error:** I am missing the **Manage Roles** permission.\n\nPlease inform a server admin of this issue.',
			ephemeral: true
		});

		return;
	}

	if (role && error.message === 'Missing Permissions') {
		const me = await interaction.guild.members.fetchMe();

		if (me.roles.highest.position < role.position) {
			await interaction.reply({
				content: '**Error:** For me to be able to manage color roles, I must have at least one role above all the color roles in the server\'s role list.\n\nPlease inform a server admin of this issue.',
				ephemeral: true
			});

			return;
		}
	}

	throw error;
};
