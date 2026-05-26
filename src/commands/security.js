// src/commands/security.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const antinukeConfig = require('../utils/antinukeConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('security')
        .setDescription('Advanced security commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false)
        .addSubcommand(sub =>
            sub
                .setName('antinukeon')
                .setDescription('Enable the antinuke system'))
        .addSubcommand(sub =>
            sub
                .setName('antinukeoff')
                .setDescription('Disable the antinuke system'))
        .addSubcommand(sub =>
            sub
                .setName('antinukeconfig')
                .setDescription('Show current antinuke configuration'))
        .addSubcommand(sub =>
            sub
                .setName('antiraid')
                .setDescription('Lock all channels in the server (anti-raid mode)'))
        .addSubcommand(sub =>
            sub
                .setName('antirolenuke')
                .setDescription('Configure anti-role-nuke settings')
                .addIntegerOption(opt =>
                    opt.setName('threshold')
                        .setDescription('Max role changes in 10 seconds')
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false))
                .addBooleanOption(opt =>
                    opt.setName('autoaction')
                        .setDescription('Auto-remove roles from offenders')
                        .setRequired(false))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        if (subcommand === 'antinukeon') {
            await antinukeConfig.update(guildId, { enabled: true });
            
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('🛡️ Anti-Nuke System')
                .setDescription('Anti-nuke has been **ENABLED**\n\nAll security features are now active.')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });

        } else if (subcommand === 'antinukeoff') {
            await antinukeConfig.update(guildId, { enabled: false });
            
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('🛡️ Anti-Nuke System')
                .setDescription('Anti-nuke has been **DISABLED**\n\nServer is now vulnerable to attacks.')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });

        } else if (subcommand === 'antinukeconfig') {
            const config = await antinukeConfig.get(guildId);
            
            const embed = new EmbedBuilder()
                .setColor(config.enabled ? 0x00ff00 : 0xff0000)
                .setTitle('🛡️ Anti-Nuke Configuration')
                .addFields(
                    { name: 'Status', value: config.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: 'Log Channel', value: config.logChannelId ? `<#${config.logChannelId}>` : 'Not set', inline: true },
                    { name: 'Warning Threshold', value: `${config.warnThreshold} messages`, inline: true },
                    { name: '10min Timeout', value: `${config.timeout1Threshold} messages`, inline: true },
                    { name: '1 Day Timeout', value: `${config.timeout2Threshold} messages`, inline: true },
                    { name: 'Reset Time', value: `${config.resetSeconds} seconds`, inline: true }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });

        } else if (subcommand === 'antiraid') {
            // Lock all channels
            const channels = interaction.guild.channels.cache;
            let locked = 0;
            
            await interaction.deferReply({ ephemeral: true });
            
            for (const [_, channel] of channels) {
                if (channel.isTextBased() || channel.isVoiceBased()) {
                    try {
                        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                            SendMessages: false,
                            Connect: false
                        });
                        locked++;
                    } catch (e) {
                        // Skip
                    }
                }
            }
            
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('🚨 ANTI-RAID ACTIVATED')
                .setDescription(`All channels have been locked.\n\n**Locked:** ${locked} channels\n**Executed by:** ${interaction.user.tag}`)
                .setTimestamp();
            
            // Send to log channel if set
            const config = await antinukeConfig.get(guildId);
            if (config.logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
                if (logChannel) {
                    await logChannel.send({ embeds: [embed] }).catch(() => {});
                }
            }
            
            await interaction.editReply({ embeds: [embed] });

        } else if (subcommand === 'antirolenuke') {
            const threshold = interaction.options.getInteger('threshold');
            const autoAction = interaction.options.getBoolean('autoaction');
            
            const updates = {};
            if (threshold !== null) updates.roleNukeThreshold = threshold;
            if (autoAction !== null) updates.roleNukeAutoAction = autoAction;
            
            await antinukeConfig.update(guildId, updates);
            
            const config = await antinukeConfig.get(guildId);
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('⚙️ Anti-Role-Nuke Configuration')
                .addFields(
                    { name: 'Role Change Threshold', value: `${config.roleNukeThreshold || 3} changes in 10s`, inline: true },
                    { name: 'Auto Action', value: (config.roleNukeAutoAction !== false) ? '✅ Enabled' : '❌ Disabled', inline: true }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};