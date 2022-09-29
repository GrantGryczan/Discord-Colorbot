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
				.setName('color')
				.setDescription('The hex color code to set your username to, "reset" to remove your hex color role, or "help" for more info')
				.setAutocomplete(true)
		)),
	execute: async interaction => {
		const colorValue = interaction.options.getString('color')!;

		console.log(colorValue);

		return interaction.reply({ content: 'Slash commands aren\'t implemented yet. <:bikestunts:294644919874748418>', ephemeral: true });
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
			autocompleteHex += partialColor;
		}

		let remainingHexDigits = 6 - partialColor.length;
		while (remainingHexDigits--) {
			autocompleteHex += Math.floor(Math.random() * 16).toString(16);
		}

		const options = [
			{ value: 'hex', name: autocompleteHex },
			{ value: 'reset', name: 'reset' },
			{ value: 'help', name: 'help' }
		].sort((a, b) => (
			b.name.indexOf(focusedValue) - a.name.indexOf(focusedValue)
		));

		await interaction.respond(options);
	}
});
