import { REST } from 'discord.js';

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN!);

export default rest;
