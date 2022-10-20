import type { HexColorString, Role } from 'discord.js';
import { SlashCommandBuilder, bold, escapeMarkdown } from 'discord.js';
import interactions, { byOptionIndexOf, stringToOption } from '../modular-interactions';
import removeColorRoleFromMember, { addColorToMember, isColorRole } from '../color-roles';

const MAXIMUM_GUILD_ROLES_REACHED = 30005;

const COLOR = /^#?(?:([\da-f])([\da-f])([\da-f])|([\da-f]{6}))$/i;
const PARTIAL_COLOR = /^#?[\da-f]{0,6}/i;

const DISCORD_BACKGROUND_COLOR = '#36393e';

/** An object of the red, green, and blue values that make up a color, each 0 to 255. */
type ColorRGB = { red: number, green: number, blue: number };

type ColorRoleWithRGB = {
	role: Role,
	color: ColorRGB
};

/** The number of bits in a hex digit. */
const HEX_DIGIT_BITS = 4;

const getColorRGB = (colorNumber: number): ColorRGB => ({
	red: colorNumber >> 4 * HEX_DIGIT_BITS,
	green: (colorNumber & 0x00ff00) >> 2 * HEX_DIGIT_BITS,
	blue: colorNumber & 0x0000ff
});

/** Gets the squared distance between two 3D points in RGB space. */
const getRGBDistanceSquared = (a: ColorRGB, b: ColorRGB) => (
	(a.red - b.red) ** 2
	+ (a.green - b.green) ** 2
	+ (a.blue - b.blue) ** 2
);

const normalizeColor = (color: string) => color.replace(COLOR, '#$1$1$2$2$3$3$4').toLowerCase() as HexColorString;

interactions.add({
	data: new SlashCommandBuilder()
		.setName('color')
		.setDescription('Set your username color.')
		.setDMPermission(false)
		.addStringOption(option => (
			option
				.setRequired(true)
				.setName('value')
				.setDescription('A hex code to set as your color, "reset" to remove your color role, or "help" for info on hex codes.')
				.setAutocomplete(true)
		)),
	execute: async interaction => {
		const value = interaction.options.getString('value')!;

		if (value === 'reset') {
			const colorRole = interaction.member.roles.cache.find(isColorRole);

			if (!colorRole) {
				return interaction.reply({
					content: 'You don\'t have a color role to reset.\n\n_Color roles are always named starting with a `#` followed by six characters, each `0` to `9` or lowercase `a` to `f`._',
					ephemeral: true
				});
			}

			await removeColorRoleFromMember(interaction, colorRole);

			return interaction.reply({
				content: `Your **${colorRole.name}** color role has been removed.`,
				ephemeral: true
			});
		}

		if (COLOR.test(value)) {
			const color = normalizeColor(value);

			const oldColorRole = interaction.member.roles.cache.find(isColorRole);
			if (oldColorRole) {
				// Remove the old color role first in case it's necessary to make room for the new one.
				await removeColorRoleFromMember(interaction, oldColorRole);
			}

			return addColorToMember(interaction, color)
				.then(colorRole => interaction.reply({
					content: 'Your color has been set:',
					embeds: [{
						title: colorRole.name,
						color: colorRole.color,
						...colorRole.name === DISCORD_BACKGROUND_COLOR && {
							description: 'Why?'
						}
					}],
					ephemeral: true
				}))
				.catch(async error => {
					if (oldColorRole) {
						// Try to restore their old color role since they didn't get the new one.
						await addColorToMember(interaction, oldColorRole.hexColor)
							.catch(() => {});
					}

					if (error.code !== MAXIMUM_GUILD_ROLES_REACHED) {
						throw error;
					}

					const colorRolesWithRGB: ColorRoleWithRGB[] = [];

					const colorNumber = Number.parseInt(color.slice(1), 16);
					const colorRGB = getColorRGB(colorNumber);

					for (const role of interaction.guild.roles.cache.values()) {
						if (!isColorRole(role)) {
							continue;
						}

						colorRolesWithRGB.push({
							role,
							color: getColorRGB(role.color)
						});
					}

					if (colorRolesWithRGB.length === 0) {
						return interaction.reply({
							content: '**Error:** The maximum role limit has been reached and no color roles can be created.',
							ephemeral: true
						});
					}

					return interaction.reply({
						content: 'The maximum role limit has been reached and no more color roles can be created. If you want, you can choose a color someone else is already using. Below are some similar colors I found to the one you entered.',
						embeds: [{
							description: (
								colorRolesWithRGB
									.sort((a, b) => (
										getRGBDistanceSquared(a.color, colorRGB)
										- getRGBDistanceSquared(b.color, colorRGB)
									))
									.slice(0, 20)
									.map(roleWithRGB => roleWithRGB.role)
									.join(' ')
							),
							color: colorNumber
						}],
						ephemeral: true
					});
				});
		}

		let helpMessage = 'If you don\'t know how hex color codes work, you can generate one using a [color picker](https://www.google.com/search?q=color+picker).';
		if (value !== 'help') {
			helpMessage = `${bold(escapeMarkdown(value))} is not a valid hex color code! ${helpMessage}`;
		}

		return interaction.reply({ content: helpMessage, ephemeral: true });
	},
	autocomplete: async interaction => {
		const focusedValue = interaction.options.getFocused();
		const partialColorMatch = focusedValue.match(PARTIAL_COLOR);

		let autocompleteHex = '#';
		let partialColor = '';

		if (partialColorMatch) {
			partialColor = partialColorMatch[0];

			if (partialColor.startsWith('#')) {
				partialColor = partialColor.slice(1);
			} else if (partialColor.length !== 0) {
				autocompleteHex = '';
			}

			partialColor = partialColor.slice(0, 6);
			autocompleteHex += partialColor.toLowerCase();
		}

		const optionStrings: string[] = [];

		if (partialColor.length === 3) {
			optionStrings.push(autocompleteHex);
		}

		let remainingHexDigits = 6 - partialColor.length;
		while (remainingHexDigits--) {
			autocompleteHex += Math.floor(Math.random() * 16).toString(16);
		}

		optionStrings.push(autocompleteHex, 'reset', 'help');

		return interaction.respond(
			optionStrings
				.map(stringToOption)
				.sort(byOptionIndexOf(focusedValue))
		);
	}
});
