import { SlashCommandBuilder } from 'discord.js';
import { addCommand } from '../lib/commands';

const PARTIAL_COLOR = /^#?[0-9a-f]{0,6}/i;

addCommand({
	data: new SlashCommandBuilder()
		.setName('color')
		.setDescription('Set your username color')
		.addStringOption(option => (
			option
				.setRequired(true)
				.setName('code')
				.setDescription('The hex color code to set your username to, or "reset" to remove your hex color role')
				.setAutocomplete(true)
		)),
	execute: async interaction => {
		const hexCode = interaction.options.getString('hex code')!;

		console.log(hexCode);

		return interaction.reply({ content: 'What up', ephemeral: true });
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
			} else {
				autocompleteHex = '';
			}

			partialColor = partialColor.slice(0, 6);
			autocompleteHex += partialColor;
		}

		let remainingHexDigits = 6 - partialColor.length;
		while (remainingHexDigits--) {
			autocompleteHex += Math.floor(Math.random() * 16).toString(16);
		}

		await interaction.respond([
			{ value: 'reset', name: 'reset' },
			{ value: 'hex', name: autocompleteHex }
		]);
	}
});
