import type { ChatInputCommandInteraction, Role } from 'discord.js';
import { roleManagementErrors } from './errors';

/**
 * Removes a color role from an interaction's member, deleting the role if they were the only member who had it.
 *
 * If there is an error, this will reply with a description of the error and never resolve.
 */
const removeColorRoleFromMember = (
	interaction: ChatInputCommandInteraction<'cached'>,
	role: Role
) => new Promise<void>(async resolve => {
	await interaction.member.roles.remove(role)
		.then(async () => {
			if (role.members.size === 0) {
				await role.delete()
					.then(() => {
						resolve();
					})
					.catch(roleManagementErrors(interaction, role));
			} else {
				resolve();
			}
		})
		.catch(roleManagementErrors(interaction, role));
});

export default removeColorRoleFromMember;
