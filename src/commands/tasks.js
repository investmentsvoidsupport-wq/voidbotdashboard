// src/commands/tasks.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const creditSystem = require('../utils/creditSystem');

// ==================== BUILD TASKS EMBED ====================

function buildTasksEmbed(config) {
  const embed = new EmbedBuilder()
    .setTitle('🎯 Void Tasks')
    .setDescription('Complete tasks and earn **Void Credits** (<:zyn_pouch:1310283145325707264>)!')
    .setColor(0x8a2be2)
    .setThumbnail('https://cdn.discordapp.com/emojis/1310283145325707264.webp?size=128');

  // Daily Check-in
  embed.addFields({
    name: '🔆 Daily Check-in Rewards',
    value: `Earn rewards every day! The longer your claim streak, the more points you earn!\n\n**Reward:** 10 <:zyn_pouch:1310283145325707264> (×Streak)\n**Streak Increment:** 1 day\n**Max Streak:** 6\n\n*Updated ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}*`,
    inline: false
  });

  // Role Rewards
  if (config?.roleRewards && config.roleRewards.length > 0) {
    let roleRewardText = 'Certain roles earn rewards periodically. The more roles, the more rewards!\n\n';
    config.roleRewards.forEach(reward => {
      roleRewardText += `**<@&${reward.roleId}>:** ${reward.amount} <:zyn_pouch:1310283145325707264> (Daily)\n`;
    });
    roleRewardText += `\n*Updated ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}*`;
    
    embed.addFields({
      name: '🙋 Role Claim Rewards',
      value: roleRewardText,
      inline: false
    });
  }

  // Message Rewards
  if (config?.messageRewards && config.messageRewards.length > 0) {
    let msgRewardText = 'Earn rewards just by chatting! Engage in conversations and connect with fellow members.\n\n';
    config.messageRewards.forEach(reward => {
      msgRewardText += `**${reward.messageCount} messages:** ${reward.amount} <:zyn_pouch:1310283145325707264> (Weekly)\n`;
    });
    msgRewardText += `\n*Updated ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}*`;

    embed.addFields({
      name: '💬 Message Rewards',
      value: msgRewardText,
      inline: false
    });
  }

  // Invite Rewards
  embed.addFields({
    name: '💞 Invite Rewards',
    value: `Earn rewards for every invite. The more friends you invite, the more you earn!\n\n**Reward:** 15 <:zyn_pouch:1310283145325707264> per invite\n**Account Age Required:** 1 day(s)\n\n*Updated ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}*`,
    inline: false
  });

  // Boost Rewards
  embed.addFields({
    name: '⭐ Boost the Discord',
    value: `Get rewarded for boosting the server! The more you boost, the bigger the rewards!\n\n**Reward:** 15 <:zyn_pouch:1310283145325707264> per boost\n**Reward Limit:** Unlimited\n\n*Updated ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}*`,
    inline: false
  });

  return embed;
}

// ==================== CLAIM BUTTONS ====================

function getClaimButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('claim_daily')
      .setLabel('Claim Daily')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🔆'),
    new ButtonBuilder()
      .setCustomId('claim_roles')
      .setLabel('Claim Role Reward')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🙋'),
    new ButtonBuilder()
      .setCustomId('view_credits')
      .setLabel('View Credits')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('💰')
  );
}

// ==================== MAIN COMMAND ====================

const tasksCommand = new SlashCommandBuilder()
  .setName('tasks')
  .setDescription('Manage the rewards/tasks system')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false)
  .addSubcommand(sub => sub
    .setName('setup')
    .setDescription('Set up the tasks panel')
  )
  .addSubcommand(sub => sub
    .setName('edit')
    .setDescription('Edit task rewards')
  )
  .addSubcommand(sub => sub
    .setName('daily')
    .setDescription('Claim your daily reward')
  )
  .addSubcommand(sub => sub
    .setName('balance')
    .setDescription('Check your credit balance')
  );

async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'setup') {
    return await setupTasks(interaction);
  } else if (subcommand === 'edit') {
    return await editTasks(interaction);
  } else if (subcommand === 'daily') {
    return await claimDaily(interaction);
  } else if (subcommand === 'balance') {
    return await checkBalance(interaction);
  }
}

async function setupTasks(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const config = await creditSystem.getTasksConfig() || {
      roleRewards: [
        { roleId: '1481262445006684342', roleName: 'Void Community', amount: 100 },
        { roleId: '1481262445006684343', roleName: 'Staff Team', amount: 500 }
      ],
      messageRewards: [
        { messageCount: 1000, amount: 400 },
        { messageCount: 2000, amount: 500 },
        { messageCount: 3000, amount: 600 },
        { messageCount: 4000, amount: 700 }
      ]
    };

    const embed = buildTasksEmbed(config);
    const buttons = getClaimButtons();

    // Send to tasks channel (you can customize this)
    const tasksChannelId = process.env.TASKS_CHANNEL_ID || interaction.channelId;
    const channel = await interaction.client.channels.fetch(tasksChannelId).catch(() => null);

    if (!channel) {
      await interaction.editReply('Tasks channel not found. Set TASKS_CHANNEL_ID in .env');
      return;
    }

    await channel.send({
      embeds: [embed],
      components: [buttons]
    });

    await creditSystem.setTasksConfig(config);
    await interaction.editReply('✅ Tasks panel posted!');
  } catch (error) {
    console.error('Error in setupTasks:', error);
    await interaction.editReply('❌ Error setting up tasks');
  }
}

async function editTasks(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const modal = new ModalBuilder()
      .setCustomId('edit_tasks_modal')
      .setTitle('Edit Task Rewards');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('role_rewards_json')
          .setLabel('Role Rewards (JSON)')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('[{"roleId":"123","amount":100}]')
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('message_rewards_json')
          .setLabel('Message Rewards (JSON)')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('[{"messageCount":1000,"amount":400}]')
          .setRequired(false)
      )
    );

    await interaction.showModal(modal);
  } catch (error) {
    console.error('Error in editTasks:', error);
    await interaction.reply({ content: '❌ Error opening edit modal', flags: MessageFlags.Ephemeral });
  }
}

async function claimDaily(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await creditSystem.claimDailyReward(interaction.user.id);

    if (!result.success) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Daily Claim')
            .setDescription(result.message)
        ]
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ Daily Reward Claimed!')
          .setDescription(`You earned **${result.amount}** <:zyn_pouch:1310283145325707264>\nStreak: **${result.streak}/6**`)
          .setTimestamp()
      ]
    });
  } catch (error) {
    console.error('Error in claimDaily:', error);
    await interaction.editReply('❌ Error claiming reward');
  }
}

async function checkBalance(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = await creditSystem.getCredits(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0x8a2be2)
      .setTitle('💰 Your Credits')
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: 'Balance', value: `${user?.balance || 0} <:zyn_pouch:1310283145325707264>`, inline: true },
        { name: 'Total Earned', value: `${user?.totalEarned || 0} <:zyn_pouch:1310283145325707264>`, inline: true },
        { name: 'Total Spent', value: `${user?.totalSpent || 0} <:zyn_pouch:1310283145325707264>`, inline: true },
        { name: 'Daily Streak', value: `${user?.dailyStreak || 0}/6`, inline: true },
        { name: 'Messages This Week', value: `${user?.messageCountThisWeek || 0}`, inline: true },
        { name: 'Invites', value: `${user?.inviteCount || 0}`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in checkBalance:', error);
    await interaction.editReply('❌ Error fetching balance');
  }
}

module.exports = { data: tasksCommand, execute };
