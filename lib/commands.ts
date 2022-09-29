import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { SlashCommandBuilder, ChatInputCommandInteraction, InteractionResponse, AutocompleteInteraction, Interaction } from 'discord.js';
import { Collection, Routes } from 'discord.js';
import client from './client';
import rest from './rest';

export type Command = {
	/** A `SlashCommandBuilder` for the command. */
	data: Pick<SlashCommandBuilder, 'toJSON' | 'name'>,
	/** Handles a user entering the command. */
	execute: (interaction: ChatInputCommandInteraction) => Promise<InteractionResponse>,
	/** Handles autocomplete interactions for the command. */
	autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>
};

const commands = new Collection<string, Command>();
export default commands;

export const addCommand = (command: Command) => {
	commands.set(command.data.name, command);
};

client.once('ready', async () => {
	const commandsPath = path.join(process.cwd(), 'commands');
	const commandFilenames: string[] = await fs.readdir(commandsPath).catch(() => []);
	const commandCount = commandFilenames.length;
	await Promise.all(
		commandFilenames.map(async commandFilename => {
			const commandPath = path.join(commandsPath, commandFilename);
			await import(commandPath);
		})
	);

	rest.put(
		Routes.applicationCommands(client.application!.id),
		{ body: commands.map(command => command.data.toJSON()) }
	).then(() => {
		console.log(`Loaded ${commandCount} global commands`);

		if (commandCount !== 0) {
			client.on('interactionCreate', onInteractionCreate);
		}
	}).catch(console.error);
});

const onInteractionCreate = async (interaction: Interaction) => {
	if (interaction.isChatInputCommand()) {
		const command = commands.get(interaction.commandName);

		if (!command) {
			return;
		}

		command.execute(interaction).catch(error => {
			console.error(error);
			interaction.reply({ content: 'An error occurred while executing the command.', ephemeral: true });
		});
	} else if (interaction.isAutocomplete()) {
		const command = commands.get(interaction.commandName);

		if (!(command?.autocomplete)) {
			return;
		}

		command.autocomplete(interaction).catch(console.error);
	}
};