import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { SlashCommandBuilder, ChatInputCommandInteraction, InteractionResponse, AutocompleteInteraction, Interaction, ApplicationCommandOptionChoiceData, Client } from 'discord.js';
import { Collection, Routes } from 'discord.js';

export type SlashCommand = {
	/** A `SlashCommandBuilder` for the command. */
	data: Pick<SlashCommandBuilder, 'toJSON' | 'name'>,
	/** Handles a user entering the command. */
	execute: (interaction: ChatInputCommandInteraction<'cached'>) => Promise<InteractionResponse>,
	/** Handles autocomplete interactions for the command. */
	autocomplete?: (interaction: AutocompleteInteraction<'cached'>) => Promise<void>
};

const commandCollection = new Collection<string, SlashCommand>();

/** Adds a new global slash command to your bot. */
const add = (command: SlashCommand) => {
	commandCollection.set(command.data.name, command);
};

/**
 * Once the Discord client is ready, loads all the modules in your commands directory (which defaults to `path.join(process.cwd(), 'commands')`).
 *
 * Each module in your commands directory can then call `commands.add` to add a command for this function to load.
 *
 * Resolves when commands are fully loaded.
 */
const load = (
	client: Client,
	commandsPath = path.join(process.cwd(), 'commands')
) => new Promise<void>(resolve => {
	client.once('ready', async client => {
		const commandFilenames = await fs.readdir(commandsPath);
		const commandImports = [];

		for (const commandFilename of commandFilenames) {
			if (!/\.[mc]?[jt]s$/.test(commandFilename)) {
				continue;
			}

			const commandPath = path.join(commandsPath, commandFilename);
			const commandImport = import(commandPath);
			commandImports.push(commandImport);
		}

		await Promise.all(commandImports);

		const applicationCommands = Routes.applicationCommands(client.application.id);
		await client.rest.put(applicationCommands, {
			body: commandCollection.map(command => command.data.toJSON())
		});

		if (commandCollection.size !== 0) {
			client.on('interactionCreate', onInteractionCreate);
		}

		resolve();
	});
});

const onInteractionCreate = (interaction: Interaction) => {
	if (!interaction.inCachedGuild()) {
		return;
	}

	if (interaction.isChatInputCommand()) {
		const command = commandCollection.get(interaction.commandName);

		if (!command) {
			return;
		}

		command.execute(interaction).catch(error => {
			console.error(error);
			interaction.reply({ content: 'An error occurred while executing the command.', ephemeral: true });
		});
	} else if (interaction.isAutocomplete()) {
		const command = commandCollection.get(interaction.commandName);

		if (!(command?.autocomplete)) {
			return;
		}

		command.autocomplete(interaction).catch(console.error);
	}
};

const commands = { add, load };

export default commands;

/** Converts a `string` to a `{ value: string, name: string }` command option object. */
export const stringToOption = (value: string) => ({ value, name: value });

/** A sorting compare function which autocomplete options should use to sort by the index of the focused value in each option's `name`. */
export const byOptionIndexOf = (focusedValue: string) => (
	(a: ApplicationCommandOptionChoiceData, b: ApplicationCommandOptionChoiceData) => {
		const lowercaseFocusedValue = focusedValue.toLowerCase();

		// Replace `-1`s with `Infinity`s so no occurrence means last rather than first.
		const aIndex = a.name.toLowerCase().indexOf(lowercaseFocusedValue) + 1 || Infinity;
		const bIndex = b.name.toLowerCase().indexOf(lowercaseFocusedValue) + 1 || Infinity;

		return aIndex - bIndex;
	}
);
