import type { Role, ChatInputCommandInteraction, HexColorString } from 'discord.js';
import { roleManagementErrors } from './errors';

export const isColorRole = (role: Role) => role.name === role.hexColor;

/** Adds a color role of the specified color to an interaction's member. Resolves with the added color role. */
export const addColorToMember = async (
	interaction: ChatInputCommandInteraction<'cached'>,
	color: HexColorString
) => {
	let colorRole = interaction.guild.roles.cache.find(
		role => isColorRole(role) && role.name === color
	);

	if (!colorRole) {
		colorRole = await interaction.guild.roles.create({
			name: color,
			color,
			permissions: []
		}).catch(roleManagementErrors(interaction));
	}

	await interaction.member.roles.add(colorRole)
		.catch(roleManagementErrors(interaction, colorRole));

	return colorRole;
};

/** Removes the specified color role from an interaction's member, deleting the role if they were the only member who had it. */
const removeColorRoleFromMember = async (
	interaction: ChatInputCommandInteraction<'cached'>,
	colorRole: Role
) => {
	await interaction.member.roles.remove(colorRole)
		.catch(roleManagementErrors(interaction, colorRole));

	if (colorRole.members.size === 0) {
		await colorRole.delete()
			.catch(roleManagementErrors(interaction, colorRole));
	}
};

export default removeColorRoleFromMember;
