import type { HexColorString } from 'discord.js';
import { SlashCommandBuilder, bold, escapeMarkdown } from 'discord.js';
import commands, { byOptionIndexOf, stringToOption } from '../lib/commands';
import removeColorRoleFromMember, { addColorRoleToMember, getOrCreateColorRole, isColorRole } from '../src/color-roles';

const COLOR = /^#?(?:([\da-f])([\da-f])([\da-f])|([\da-f]{6}))$/i;
const PARTIAL_COLOR = /^#?[\da-f]{0,6}/i;

const normalizeColor = (color: string) => color.replace(COLOR, '#$1$1$2$2$3$3$4').toLowerCase() as HexColorString;

commands.add({
	data: new SlashCommandBuilder()
		.setName('color')
		.setDescription('Set your username color')
		.setDMPermission(false)
		.addStringOption(option => (
			option
				.setRequired(true)
				.setName('value')
				.setDescription('A hex code to set as your color, "reset" to remove your color role, or "help" for info on hex codes')
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
			await removeColorRoleFromMember(interaction);

			const color = normalizeColor(value);
			const colorRole = await getOrCreateColorRole(interaction, color)
				.catch(error => new Promise<never>((_, reject) => {
					console.log('testing', error.message);

					reject(error);
				}));

			return addColorRoleToMember(interaction, colorRole);
		}

		let helpMessage = 'If you don\'t know how hex color codes work, you can generate one using a [color picker](https://www.google.com/search?q=color+picker).';
		if (value !== 'help') {
			helpMessage = `${bold(escapeMarkdown(value.replace(/\\/g, '\\\\')))} is not a valid hex color code! ${helpMessage}`;
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

		await interaction.respond(
			optionStrings
				.map(stringToOption)
				.sort(byOptionIndexOf(focusedValue))
		);
	}
});
