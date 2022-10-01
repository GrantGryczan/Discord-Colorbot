import type { Role } from 'discord.js';

const isColorRole = (role: Role) => role.name === role.hexColor;

export default isColorRole;
