import type { Guild, RepliableInteraction, Role, BaseMessageOptions } from 'discord.js';

const MISSING_ACCESS = 50001;
const MISSING_PERMISSIONS = 50013;

/** Source: https://discord.com/branding */
const RED = 0xed4245;

export const getErrorMessageOptions = (
	description: string,
	/** The server that the error is from if this is a DM for an error that occurred in a guild. */
	guild?: Guild
): BaseMessageOptions => ({
	// This empty content string is necessary in case this is being used to edit a message.
	content: '',
	embeds: [{
		color: RED,
		title: 'Error',
		description,
		footer: guild && {
			text: guild.name,
			icon_url: guild.iconURL({ forceStatic: true }) || undefined
		}
	}]
});

/**
 * Returns a promise rejection handler for role management operations. A role option must also be specified if the error would be caused by managing a particular role.
 *
 * If the handler catches an error it expects, it never resolves, tries to DM the error message to the server owner, and passes the error message into the callback and/or an ephemeral interaction reply.
 *
 * If the handler catches an error it doesn't expect, it throws it again.
 */
export const roleManagementErrors = ({
	interaction,
	role,
	guild = (interaction || role)?.guild,
	callback
}: {
	interaction?: RepliableInteraction<'cached'>,
	role?: Role,
	guild?: Guild,
	callback?: (messageOptions: BaseMessageOptions) => unknown
}) => {
	if (!guild) {
		throw new TypeError('You must set the `guild` option if both `interaction` and `role` are unset.');
	}

	const sendErrorMessage = (description: string) => {
		const options = getErrorMessageOptions(description);
		const dmOptions = getErrorMessageOptions(description, guild);

		return Promise.all([
			interaction?.reply({
				...options,
				ephemeral: true
			}),
			guild.client.users.send(guild.ownerId, dmOptions),
			callback?.(options)
		]);
	};

	return (error: any) => new Promise<never>(async (_, reject) => {
		if (error.code === MISSING_ACCESS) {
			await sendErrorMessage('I am missing the **Manage Roles** permission.');
			return;
		}

		if (role && error.code === MISSING_PERMISSIONS) {
			const me = await role.guild.members.fetchMe();

			if (me.roles.highest.position < role.position) {
				await sendErrorMessage('For me to be able to manage color roles, I must have at least one role above all the color roles in the server\'s role list.');
				return;
			}
		}

		reject(error);
	});
};
