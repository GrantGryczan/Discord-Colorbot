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

const usedAntiSpamKeys = new WeakSet<Record<never, never>>();

/**
 * Returns a promise rejection handler for role management operations. A role option must also be specified if the error would be caused by managing a particular role.
 *
 * If the handler catches an error it expects, it
 * * never resolves,
 * * passes the error message into the callback if set,
 * * sends an ephemeral reply with the error message to the interaction if set, and
 * * tries to DM the error message to the server owner if they're not already the interaction user (unless an anti-spam key is set and the server owner has already been DMed with that key before).
 *
 * If the handler catches an error it doesn't expect, it throws it again.
 */
export const roleManagementErrors = ({
	interaction,
	role,
	guild = (interaction || role)?.guild,
	callback,
	antiSpamKey
}: {
	interaction?: RepliableInteraction<'cached'>,
	role?: Role,
	guild?: Guild,
	callback?: (messageOptions: BaseMessageOptions) => unknown,
	/** If an error is DMed to the server owner with this set (to an empty object), they will not be DMed again by any handler for which the same object was set here. */
	antiSpamKey?: Record<never, never>
}) => {
	if (!guild) {
		throw new TypeError('You must set the `guild` option if both `interaction` and `role` are unset.');
	}

	const sendErrorMessage = (description: string) => {
		const options = getErrorMessageOptions(description);

		interaction?.reply({
			...options,
			ephemeral: true
		});

		callback?.(options);

		if (interaction?.user.id === guild.ownerId) {
			return;
		}

		if (antiSpamKey) {
			if (usedAntiSpamKeys.has(antiSpamKey)) {
				return;
			}

			usedAntiSpamKeys.add(antiSpamKey);
		}

		guild.client.users.send(
			guild.ownerId,
			getErrorMessageOptions(description, guild)
		).catch(() => {});
	};

	return (error: any) => new Promise<never>(async (_, reject) => {
		if (error.code === MISSING_ACCESS) {
			sendErrorMessage('I am missing the **Manage Roles** permission.');
			return;
		}

		if (role && error.code === MISSING_PERMISSIONS) {
			const me = await guild.members.fetchMe();

			if (me.roles.highest.position < role.position) {
				sendErrorMessage('For me to be able to manage color roles, I must have at least one role above all the color roles in the server\'s role list.');
				return;
			}
		}

		reject(error);
	});
};
