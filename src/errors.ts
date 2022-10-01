import type { ChatInputCommandInteraction, Role } from 'discord.js';

/**
 * Returns a promise rejection handler for role management. A role argument must also be specified if this should catch errors caused by incorrect role positions.
 *
 * If the handler catches an error it expects, it replies to the specified interaction with a corresponding error message and never resolves.
 *
 * If the handler catches an error it doesn't expect, it throws it again.
 */
export const roleManagementErrors = (
	interaction: ChatInputCommandInteraction<'cached'>,
	role?: Role
) => (error: any) => new Promise<never>(async (_, reject) => {
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

	reject(error);
});
