const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    REST, 
    Routes, 
    SlashCommandBuilder,
    AttachmentBuilder 
} = require('discord.js');
const db = require('croxydb');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

// ==========================================
// CONFIGURACIÓN INICIAL
// ==========================================
const TOKEN = 'TU_TOKEN_AQUI'; // Pegá tu Token entre las comillas
const PURPLE_COLOR = 0x8A2BE2;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// ==========================================
// REGISTRO DE COMANDOS SLASH
// ==========================================
const commands = [
    new SlashCommandBuilder()
        .setName('pts')
        .setDescription('Consulta tus puntos o los de otro usuario')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a consultar')),

    new SlashCommandBuilder()
        .setName('addpts')
        .setDescription('Añade puntos a un usuario (Admin)')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true))
        .addIntegerOption(opt => opt.setName('puntos').setDescription('Cantidad de puntos').setRequired(true)),

    new SlashCommandBuilder()
        .setName('removepts')
        .setDescription('Quita puntos a un usuario (Admin)')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true))
        .addIntegerOption(opt => opt.setName('puntos').setDescription('Cantidad de puntos').setRequired(true)),

    new SlashCommandBuilder()
        .setName('baltop')
        .setDescription('Muestra el Top 10 de usuarios con más puntos'),

    new SlashCommandBuilder()
        .setName('ticket-panel')
        .setDescription('Envía el panel para abrir tickets (Admin)'),

    new SlashCommandBuilder()
        .setName('setwelcome')
        .setDescription('Configura el canal de bienvenidas (Admin)')
        .addChannelOption(opt => opt.setName('canal').setDescription('Canal de bienvenidas').setRequired(true))
].map(cmd => cmd.toJSON());

// ==========================================
// EVENTO READY & REGISTRO DE COMANDOS
// ==========================================
client.once('ready', async () => {
    console.log(`👁️ Xanax Bot encendido como: ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('✅ Comandos registrador correctamente.');
    } catch (error) {
        console.error('Error al registrar comandos:', error);
    }
});

// ==========================================
// SISTEMA DE BIENVENIDAS CON CANVAS
// ==========================================
client.on('guildMemberAdd', async member => {
    const channelId = db.get(`welcome_${member.guild.id}`);
    if (!channelId) return;

    const channel = member.guild.channels.cache.get(channelId);
    if (!channel) return;

    const canvas = createCanvas(700, 250);
    const ctx = canvas.getContext('2d');

    // Fondo
    ctx.fillStyle = '#111217';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Borde morado
    ctx.strokeStyle = '#8A2BE2';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Texto de bienvenida
    ctx.font = '30px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('BIENVENIDO/A', 220, 80);

    ctx.font = '36px sans-serif';
    ctx.fillStyle = '#8A2BE2';
    ctx.fillText(member.user.username, 220, 130);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(`Miembro #${member.guild.memberCount}`, 220, 170);

    // Avatar circular
    try {
        const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 128 });
        const avatar = await loadImage(avatarURL);

        ctx.save();
        ctx.beginPath();
        ctx.arc(100, 125, 60, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(avatar, 40, 65, 120, 120);
        ctx.restore();
    } catch (err) {
        console.error('Error cargando avatar:', err);
    }

    const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'welcome-image.png' });
    channel.send({ content: `¡Bienvenido/a a **${member.guild.name}**, ${member}!`, files: [attachment] });
});

// ==========================================
// MANEJO DE COMANDOS SLASH
// ==========================================
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, member } = interaction;

    // --- /pts ---
    if (commandName === 'pts') {
        const user = options.getUser('usuario') || interaction.user;
        const pts = db.get(`pts_${guild.id}_${user.id}`) || 0;

        const embed = new EmbedBuilder()
            .setTitle(`✨ PUNTOS DE ${user.username.toUpperCase()}`)
            .setDescription(`Actualmente tiene: **${pts}** puntos.`)
            .setColor(PURPLE_COLOR);

        return interaction.reply({ embeds: [embed] });
    }

    // --- /addpts ---
    if (commandName === 'addpts') {
        if (!member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ No tienes permisos para usar este comando.', ephemeral: true });
        }
        const user = options.getUser('usuario');
        const cantidad = options.getInteger('puntos');

        const actual = db.get(`pts_${guild.id}_${user.id}`) || 0;
        db.set(`pts_${guild.id}_${user.id}`, actual + cantidad);

        return interaction.reply({ content: `✅ Se añadieron **${cantidad}** puntos a ${user}.` });
    }

    // --- /removepts ---
    if (commandName === 'removepts') {
        if (!member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ No tienes permisos para usar este comando.', ephemeral: true });
        }
        const user = options.getUser('usuario');
        const cantidad = options.getInteger('puntos');

        const actual = db.get(`pts_${guild.id}_${user.id}`) || 0;
        const nuevo = Math.max(0, actual - cantidad);
        db.set(`pts_${guild.id}_${user.id}`, nuevo);

        return interaction.reply({ content: `✅ Se quitaron **${cantidad}** puntos a ${user}.` });
    }

    // --- /baltop ---
    if (commandName === 'baltop') {
        const allData = db.all();
        const prefix = `pts_${guild.id}_`;

        const guildKeys = Object.keys(allData)
            .filter(k => k.startsWith(prefix))
            .map(k => ({ id: k, value: allData[k] }));

        guildKeys.sort((a, b) => b.value - a.value);
        const top = guildKeys.slice(0, 10);

        let text = '';
        for (let i = 0; i < top.length; i++) {
            const userId = top[i].id.split('_')[2];
            text += `**${i + 1}.** <@${userId}> — **${top[i].value}** pts\n`;
        }

        const embed = new EmbedBuilder()
            .setTitle('🏆 RANKING DE PUNTOS')
            .setDescription(text || 'Aún no hay puntos registrados en este servidor.')
            .setColor(PURPLE_COLOR);

        return interaction.reply({ embeds: [embed] });
    }

    // --- /ticket-panel ---
    if (commandName === 'ticket-panel') {
        if (!member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('📩 SOPORTE Y TICKETS')
            .setDescription('Si necesitas ayuda o realizar una consulta, presiona el botón de abajo para abrir un ticket privado.')
            .setColor(PURPLE_COLOR);

        const btn = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open_ticket')
                .setLabel('Abrir Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫')
        );

        return interaction.reply({ embeds: [embed], components: [btn] });
    }

    // --- /setwelcome ---
    if (commandName === 'setwelcome') {
        if (!member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
        }
        const canal = options.getChannel('canal');
        db.set(`welcome_${guild.id}`, canal.id);

        return interaction.reply({ content: `✅ Canal de bienvenidas configurado en ${canal}.` });
    }
});

// ==========================================
// BOTONES E INTERACCIONES DE TICKETS
// ==========================================
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'open_ticket') {
        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: ['ViewChannel']
                },
                {
                    id: interaction.user.id,
                    allow: ['ViewChannel', 'SendMessages']
                }
            ]
        });

        const closeBtn = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Cerrar Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
        );

        await ticketChannel.send({
            content: `Hola ${interaction.user}, en breve el equipo te atenderá.`,
            components: [closeBtn]
        });

        return interaction.reply({ content: `✅ Ticket creado en ${ticketChannel}`, ephemeral: true });
    }

    if (interaction.customId === 'close_ticket') {
        await interaction.reply('🔒 El ticket se cerrará en 5 segundos...');
        setTimeout(() => interaction.channel.delete(), 5000);
    }
});

// LOGIN
client.login(TOKEN);