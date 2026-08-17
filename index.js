const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');

// Inicializar la base de datos en la carpeta persisente del volumen (/app/data)
const db = new QuickDB({ filePath: '/app/data/json.sqlite' });

const TOKEN = process.env.TOKEN;
const CLIENT_ID = '1538778042401554463';

// Definición de Comandos Slash
const commands = [
    new SlashCommandBuilder()
        .setName('puntos')
        .setDescription('Consulta tus puntos o los de otro usuario')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('Usuario a consultar (opcional)')
                .setRequired(false)
        ),
    new SlashCommandBuilder()
        .setName('dar-puntos')
        .setDescription('Otorga puntos a un usuario')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('Usuario que recibirá los puntos')
                .setRequired(true)
        )
        .addIntegerOption(option => 
            option.setName('cantidad')
                .setDescription('Cantidad de puntos a entregar')
                .setRequired(true)
        )
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

// Inicializar el cliente del bot
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
    console.log(`Bot conectado exitosamente como: ${client.user.tag}`);
});

// Manejo de Comandos Slash
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    // Comando: /puntos
    if (commandName === 'puntos') {
        const usuario = interaction.options.getUser('usuario') || interaction.user;
        const puntosActuales = await db.get(`puntos_${usuario.id}`) || 0;

        await interaction.reply(`🪙 **${usuario.username}** tiene **${puntosActuales}** puntos.`);
    }

    // Comando: /dar-puntos
    if (commandName === 'dar-puntos') {
        const usuario = interaction.options.getUser('usuario');
        const cantidad = interaction.options.getInteger('cantidad');

        const nuevosPuntos = await db.add(`puntos_${usuario.id}`, cantidad);

        await interaction.reply(`✅ Le has otorgado **${cantidad}** puntos a **${usuario.username}**. Ahora tiene **${nuevosPuntos}** puntos.`);
    }
});

client.login(TOKEN);