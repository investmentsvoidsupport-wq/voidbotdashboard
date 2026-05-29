const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const guildConfig = require('../utils/guildConfig');
const config = require('../config');
const logManager = require('../utils/logManager');

const pendingRequests = new Map();

function isValidSnowflake(id) {
  return /^\d{17,19}$/.test(id);
}

function parseDate(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function createLoaEmbed({ targetId, requester, startDate, endDate, reason, status, approverId, approvedAt }) {
  const embed = new EmbedBuilder()
    .setTitle(status === 'Approved' ? '✅ LOA Approved' : status === 'Rejected' ? '❌ LOA Rejected' : '🟡 LOA Request')
    .setColor(status === 'Approved' ? 0x00ff00 : status === 'Rejected' ? 0xff0000 : 0xffa500)
    .addFields(
      { name: 'User ID', value: targetId, inline: true },
      { name: 'Requested by', value: requester, inline: true },
      { name: 'Status', value: status, inline: true }
    )
    .setTimestamp();

  if (startDate) {
    embed.addFields({ name: 'Start Date', value: `<t:${Math.floor(startDate / 1000)}:F>`, inline: true });
  }
  if (endDate) {
    embed.addFields({ name: 'End Date', value: `<t:${Math.floor(endDate / 1000)}:F>`, inline: true });
  }
  if (reason) {
    embed.addFields({ name: 'Reason', value: reason, inline: false });
  }
  if (approverId) {
    embed.addFields({ name: 'Approved by', value: `<@${approverId}>`, inline: true });
  }
  if (approvedAt) {
    embed.addFields({ name: 'Approved at', value: `<t:${Math.floor(approvedAt / 1000)}:F>`, inline: true });
  }

  return embed;
}

function createActionRow(requestId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`loa_approve_${requestId}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`loa_reject_${requestId}`)
      .setLabel('Reject')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

async function execute(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('loa_request_modal')
    .setTitle('Create LOA Request');

  const userInput = new TextInputBuilder()
    .setCustomId('user_id')
    .setLabel('User ID')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('123456789012345678')
    .setRequired(true);

  const startInput = new TextInputBuilder()
    .setCustomId('start_date')
    .setLabel('Start Date (YYYY-MM-DD)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('2026-06-01')
    .setRequired(true);

  const endInput = new TextInputBuilder()
    .setCustomId('end_date')
    .setLabel('End Date (YYYY-MM-DD)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('2026-06-15')
    .setRequired(true);

  const reasonInput = new TextInputBuilder()
    .setCustomId('reason')
    .setLabel('Reason for LOA')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Describe why this LOA is requested.')
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(userInput),
    new ActionRowBuilder().addComponents(startInput),
    new ActionRowBuilder().addComponents(endInput),
    new ActionRowBuilder().addComponents(reasonInput)
  );

  await interaction.showModal(modal);
}

async function handleModalSubmit(interaction) {
  const userId = interaction.fields.getTextInputValue('user_id').trim();
  const startDateValue = interaction.fields.getTextInputValue('start_date').trim();
  const endDateValue = interaction.fields.getTextInputValue('end_date').trim();
  const reason = interaction.fields.getTextInputValue('reason').trim();

  if (!isValidSnowflake(userId)) {
    await interaction.reply({ content: '❌ Invalid User ID format. Please provide a valid Discord ID.', ephemeral: true });
    return;
  }

  const startDate = parseDate(startDateValue);
  const endDate = parseDate(endDateValue);
  if (!startDate || !endDate) {
    await interaction.reply({ content: '❌ Start Date and End Date must be valid dates in YYYY-MM-DD format.', ephemeral: true });
    return;
  }
  if (endDate < startDate) {
    await interaction.reply({ content: '❌ End Date must be the same or after the Start Date.', ephemeral: true });
    return;
  }

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const guildId = interaction.guildId;
  const requester = `<@${interaction.user.id}>`;
  const guildConf = await guildConfig.get(guildId);
  const targetChannelId = guildConf.loaChannelId || config.loaChannelId;

  const embed = createLoaEmbed({
    targetId: userId,
    requester,
    startDate,
    endDate,
    reason,
    status: 'Pending approval'
  });

  const row = createActionRow(requestId);
  const panelMessage = await (async () => {
    if (!targetChannelId) return null;
    const channel = await interaction.guild.channels.fetch(targetChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return null;
    return channel.send({
      content: '📌 New LOA request submitted. Waiting for approval from an approver role.',
      embeds: [embed],
      components: [row]
    }).catch(() => null);
  })();

  if (panelMessage) {
    await interaction.reply({ content: `📌 LOA request submitted to <#${panelMessage.channel.id}>.`, ephemeral: true });
    pendingRequests.set(requestId, {
      guildId,
      requesterId: interaction.user.id,
      targetId: userId,
      startDate,
      endDate,
      reason,
      status: 'Pending',
      messageId: panelMessage.id,
      channelId: panelMessage.channel.id
    });
    return;
  }

  const message = await interaction.reply({
    content: '📌 LOA request submitted. Waiting for approval from an approver role.',
    embeds: [embed],
    components: [row],
    fetchReply: true
  });

  pendingRequests.set(requestId, {
    guildId,
    requesterId: interaction.user.id,
    targetId: userId,
    startDate,
    endDate,
    reason,
    status: 'Pending',
    messageId: message.id,
    channelId: message.channelId
  });
}

async function handleButton(interaction) {
  const customId = interaction.customId;
  const [prefix, action, requestId] = customId.split('_');
  if (prefix !== 'loa' || !['approve', 'reject'].includes(action)) return;

  const request = pendingRequests.get(requestId);
  if (!request) {
    await interaction.reply({ content: '❌ This LOA request is no longer active.', ephemeral: true });
    return;
  }

  if (request.guildId !== interaction.guildId) {
    await interaction.reply({ content: '❌ Invalid LOA request for this server.', ephemeral: true });
    return;
  }

  const guildConf = await guildConfig.get(interaction.guildId);
  const approverRoleId = guildConf.loaApproverRoleId || config.loaApproverRoleId;
  const isApprover = approverRoleId ? interaction.member.roles.cache.has(approverRoleId) : interaction.member.permissions.has(PermissionFlagsBits.ManageRoles);

  if (!isApprover) {
    await interaction.reply({ content: '❌ You do not have permission to approve or reject LOA requests.', ephemeral: true });
    return;
  }

  if (request.status !== 'Pending') {
    await interaction.reply({ content: '❌ This LOA request has already been processed.', ephemeral: true });
    return;
  }

  const approverId = interaction.user.id;
  const approvedAt = Date.now();
  request.status = action === 'approve' ? 'Approved' : 'Rejected';
  request.approverId = approverId;
  request.approvedAt = approvedAt;

  const embed = createLoaEmbed({
    targetId: request.targetId,
    requester: `<@${request.requesterId}>`,
    startDate: request.startDate,
    endDate: request.endDate,
    reason: request.reason,
    status: request.status,
    approverId,
    approvedAt
  });

  const row = createActionRow(requestId, true);

  if (action === 'approve') {
    const loaRoleId = guildConf.loaRoleId || config.loaRoleId;
    let assigned = false;

    if (!loaRoleId) {
      await interaction.reply({ content: '⚠️ LOA role is not configured. Please set it in /config loa role or via LOA_ROLE_ID in .env.', ephemeral: true });
      return;
    }

    const member = await interaction.guild.members.fetch(request.targetId).catch(() => null);
    if (member) {
      try {
        await member.roles.add(loaRoleId, `LOA approved by ${interaction.user.tag}`);
        assigned = true;
      } catch (err) {
        console.error('Failed to assign LOA role:', err);
      }
    }

    const entry = {
      userId: request.targetId,
      startDate: request.startDate,
      endDate: request.endDate,
      reason: request.reason,
      approvedBy: approverId,
      approvedAt,
      assigned: assigned,
      assignedRoleId: loaRoleId
    };

    const current = await guildConfig.get(interaction.guildId);
    const loaEntries = current.loaEntries || [];
    const existing = loaEntries.find(e => e.userId === request.targetId && e.status !== 'Rejected');
    if (existing) {
      Object.assign(existing, entry);
    } else {
      loaEntries.push(entry);
    }
    await guildConfig.update(interaction.guildId, { loaEntries });

    await logManager.sendLog(interaction.guild, 'mod_logs', {
      title: '✅ LOA Approved',
      description: `**User:** <@${request.targetId}> (${request.targetId})\n**Approved by:** <@${approverId}>`,
      fields: [
        { name: 'Start Date', value: `<t:${Math.floor(request.startDate / 1000)}:F>`, inline: true },
        { name: 'End Date', value: `<t:${Math.floor(request.endDate / 1000)}:F>`, inline: true },
        { name: 'Reason', value: request.reason, inline: false }
      ],
      color: 0x00ff00,
      footer: 'LOA approved',
      timestamp: true
    });
  }

  await interaction.update({ embeds: [embed], components: [row] });
}

async function handleGuildMemberAdd(member) {
  const conf = await guildConfig.get(member.guild.id);
  const loaRoleId = conf.loaRoleId || config.loaRoleId;
  if (!loaRoleId) return;

  const loaEntries = conf.loaEntries || [];
  const entry = loaEntries.find(e => e.userId === member.id && e.status === 'Approved');
  if (!entry) return;

  if (!member.roles.cache.has(loaRoleId)) {
    await member.roles.add(loaRoleId, 'Restored LOA role for returning member').catch(() => {});
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loa')
    .setDescription('Request a leave of absence (LOA) for a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  execute,
  handleModalSubmit,
  handleButton,
  handleGuildMemberAdd
};
