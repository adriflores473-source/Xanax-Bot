const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

// Configuración de credenciales
const TOKEN = 'process.env.TOKEN;'; // Pega tu Token entre las comillas
const CLIENT_ID = '1538778042401554463';

// Definición de comandos Slash
const commands = [
    new SlashCommandBuilder()
        .setName('hola')
        .setDescription('Responde con un saludo personalizado'),
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Responde con Pong')
].map(command => command.toJSON());

// Registro de comandos en la API de Discord
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Cargando comandos Slash en Discord...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );
        console.log('¡Comandos Slash registrados con éxito!');
    } catch (error) {
        console.error('Error al registrar comandos:', error);
    }
})();

// Inicialización del Bot
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
    console.log(`Bot conectado exitosamente como: ${client.user.tag}`);
});

// Respuesta a comandos Slash
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'hola') {
        await interaction.reply(`¡Hola ${interaction.user.username}! El comando slash funciona perfectamente.`);
    } else if (commandName === 'ping') {
        await interaction.reply('¡Pong! 🏓');
    }
});

client.login(TOKEN);
