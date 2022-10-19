import type {
	ChatInputCommandInteraction,
	AutocompleteInteraction,
	Interaction,
	ApplicationCommandOptionChoiceData,
	Client,
	InteractionResponse,
	ContextMenuCommandInteraction,
	ModalSubmitInteraction,
	SelectMenuInteraction,
	ButtonInteraction,
	SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';
import { ButtonBuilder, SelectMenuBuilder, ModalBuilder, SlashCommandBuilder, ContextMenuCommandBuilder, Collection, Routes } from 'discord.js';

export type ModularSlashCommand = {
	/** A `SlashCommandBuilder` for the slash command. */
	data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>,
	/** Handles a user entering the slash command. */
	execute: (interaction: ChatInputCommandInteraction<'cached'>) => Promise<InteractionResponse>,
	/** Handles autocomplete interactions for the command. */
	autocomplete?: (interaction: AutocompleteInteraction<'cached'>) => Promise<void>
};

export type ModularContextMenuCommand = {
	/** A `ContextMenuCommandBuilder` for the context menu command. */
	data: ContextMenuCommandBuilder,
	/** Handles a user selecting the context menu command. */
	execute: (interaction: ContextMenuCommandInteraction<'cached'>) => void | Promise<void>
};

export type ModularButton = {
	/** A `ButtonBuilder` for the button. */
	data: ButtonBuilder,
	/** Handles a user clicking a button. */
	click: (interaction: ButtonInteraction<'cached'>) => void | Promise<void>
};

export type ModularSelectMenu = {
	/** A `SelectMenuBuilder` for the select menu. */
	data: SelectMenuBuilder,
	/** Handles a user changing the value of the select menu. */
	change: (interaction: SelectMenuInteraction<'cached'>) => void | Promise<void>
};

export type ModularModal = {
	/** A `ModalBuilder` for the modal. */
	data: ModalBuilder,
	/** Handles a user submitting the modal. */
	submit: (interaction: ModalSubmitInteraction<'cached'>) => void | Promise<void>
};

export type ModularInteraction = ModularSlashCommand | ModularContextMenuCommand | ModularButton | ModularSelectMenu | ModularModal;

// It's better to use this than `ModularInteraction` because it improves type inference.
// For example, otherwise there are two conflicting definitions of the `execute` property, and TS doesn't know from which to use the argument types.
// Another example is that, if you're writing a `ModularSlashCommand`, it will still auto-complete the `click` property from `ModularButton`.
export type GenericModularInteraction<Builder extends ModularInteraction['data'] = ModularInteraction['data']> = {
	data: Builder
} & (
	Builder extends ModularSlashCommand['data']
		? ModularSlashCommand
		: Builder extends ModularContextMenuCommand['data']
			? ModularContextMenuCommand
			: Builder extends ModularButton['data']
				? ModularButton
				: Builder extends ModularSelectMenu['data']
					? ModularSelectMenu
					: Builder extends ModularModal['data']
						? ModularModal
						: never
);

const slashCommands = new Collection<string, ModularSlashCommand>();
const contextMenuCommands = new Collection<string, ModularContextMenuCommand>();
const buttons = new Collection<string, ModularButton>();
const selectMenus = new Collection<string, ModularSelectMenu>();
const modals = new Collection<string, ModularModal>();

/** Adds a new modular interaction to your bot. Returns the same builder passed into the `data` option. */
const add = <Builder extends ModularInteraction['data'] = ModularInteraction['data']>(
	modularInteraction: GenericModularInteraction<Builder>
): Builder => {
	if (modularInteraction.data instanceof SlashCommandBuilder) {
		slashCommands.set(
			modularInteraction.data.name,
			modularInteraction as ModularSlashCommand
		);
	} else if (modularInteraction.data instanceof ContextMenuCommandBuilder) {
		contextMenuCommands.set(
			modularInteraction.data.name,
			modularInteraction as ModularContextMenuCommand
		);
	} else if (modularInteraction.data instanceof ButtonBuilder) {
		const json = (modularInteraction.data as ButtonBuilder).toJSON();
		if ('url' in json) {
			throw TypeError('Discord does not allow bots to detect interactions for buttons with URLs, so they cannot be modular interactions.');
		}

		buttons.set(
			json.custom_id,
			modularInteraction as ModularButton
		);
	} else if (modularInteraction.data instanceof SelectMenuBuilder) {
		selectMenus.set(
			(modularInteraction.data as SelectMenuBuilder).toJSON().custom_id,
			modularInteraction as ModularSelectMenu
		);
	} else if (modularInteraction.data instanceof ModalBuilder) {
		modals.set(
			(modularInteraction.data as ModalBuilder).toJSON().custom_id,
			modularInteraction as ModularModal
		);
	}

	return modularInteraction.data;
};

/**
 * Starts listening to your interactions and requests Discord to set all your commands.
 *
 * Resolves when the request to set your commands finishes loading.
 *
 * Must only be called after the Discord.js client is ready.
 */
export const initialize = async (client: Client<true>) => {
	const applicationCommands = Routes.applicationCommands(client.application.id);
	await client.rest.put(applicationCommands, {
		body: slashCommands.map(command => command.data.toJSON())
	});

	client.on('interactionCreate', onInteractionCreate);
};

const onInteractionCreate = (interaction: Interaction) => {
	if (!interaction.inCachedGuild()) {
		return;
	}

	if (interaction.isChatInputCommand()) {
		slashCommands.get(interaction.commandName)?.execute(interaction);

	} else if (interaction.isAutocomplete()) {
		slashCommands.get(interaction.commandName)?.autocomplete?.(interaction);

	} else if (interaction.isContextMenuCommand()) {
		// TODO: Use `isUserContextMenuCommand` and `isMessageContextMenuCommand`.
		contextMenuCommands.get(interaction.commandName)?.execute(interaction);

	} else if (interaction.isButton()) {
		buttons.get(interaction.customId)?.click(interaction);

	} else if (interaction.isSelectMenu()) {
		selectMenus.get(interaction.customId)?.change(interaction);

	} else if (interaction.isModalSubmit()) {
		modals.get(interaction.customId)?.submit(interaction);
	}
};

const interactions = { add, initialize };

export default interactions;

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
