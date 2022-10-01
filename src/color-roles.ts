import type { Role, ChatInputCommandInteraction, HexColorString } from 'discord.js';
import { roleManagementErrors } from './errors';

export const isColorRole = (role: Role) => role.name === role.hexColor;

/** Creates a color role by hex color code. Doesn't check whether a color role with the specified color already exists. */
export const createColorRole = async (
	interaction: ChatInputCommandInteraction<'cached'>,
	color: HexColorString
) => {
	const colorRole = await interaction.guild.roles.create({
		name: color,
		color,
		permissions: []
	}).catch(roleManagementErrors(interaction));

	return colorRole;
};

/** Gets a color role by hex color code, or creates one if no existing color role is found. */
export const getOrCreateColorRole = async (
	interaction: ChatInputCommandInteraction<'cached'>,
	color: HexColorString
) => {
	const existingColorRole = interaction.guild.roles.cache.find(
		role => isColorRole(role) && role.name === color
	);

	if (existingColorRole) {
		return existingColorRole;
	}

	return createColorRole(interaction, color);
};

const DISCORD_BACKGROUND_COLOR = '#36393e';

/** Adds the specified color role to an interaction's member. Resolves with a corresponding response message to the interaction. */
export const addColorRoleToMember = async (
	interaction: ChatInputCommandInteraction<'cached'>,
	colorRole: Role
) => {
	await interaction.member.roles.add(colorRole)
		.catch(roleManagementErrors(interaction, colorRole));

	return interaction.reply({
		content: `Your color has been set to ${colorRole}.`,
		embeds: [{
			title: colorRole.name,
			color: colorRole.color,
			...colorRole.name === DISCORD_BACKGROUND_COLOR && {
				description: 'Why?'
			}
		}],
		ephemeral: true
	});
};

/**
 * Removes the specified color role from an interaction's member, deleting the role if they were the only member who had it.
 *
 * If no color role is specified, a color role on the member is be used automatically. If none is found, this function does nothing.
 */
const removeColorRoleFromMember = async (
	interaction: ChatInputCommandInteraction<'cached'>,
	colorRole = interaction.member.roles.cache.find(isColorRole)
) => {
	if (!colorRole) {
		return;
	}

	await interaction.member.roles.remove(colorRole)
		.catch(roleManagementErrors(interaction, colorRole));

	if (colorRole.members.size === 0) {
		await colorRole.delete()
			.catch(roleManagementErrors(interaction, colorRole));
	}
};

export default removeColorRoleFromMember;
