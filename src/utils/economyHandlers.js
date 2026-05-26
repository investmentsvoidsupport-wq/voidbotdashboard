// src/utils/economyHandlers.js
const { EmbedBuilder, MessageFlags } = require('discord.js');
const creditSystem = require('./creditSystem');

// ==================== MESSAGE TRACKING ====================

async function handleMessageCreate(message) {
  try {
    // Ignore bot messages and DMs
    if (message.author.bot || !message.guild) return;

    // Record the message
    const messageCount = await creditSystem.recordMessage(message.author.id);

    // Check if user qualifies for any message reward
    const config = await creditSystem.getTasksConfig();
    if (!config?.messageRewards) return;

    const rewards = config.messageRewards.sort((a, b) => a.messageCount - b.messageCount);

    for (const reward of rewards) {
      if (messageCount === reward.messageCount) {
        const userDoc = await creditSystem.getCredits(message.author.id);
        const week = new Date().getWeek();
        const year = new Date().getFullYear();
        const claimedKey = `messageClaimed_${year}_${week}`;

        // Check if not already claimed
        if (!userDoc?.messageRewardsClaimed?.[claimedKey]?.includes(reward.messageCount)) {
          await creditSystem.addCredits(message.author.id, reward.amount, `message_milestone_${reward.messageCount}`);

          // Optional: Send DM notification
          try {
            await message.author.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(0x00FF00)
                  .setTitle('🎉 Message Milestone!')
                  .setDescription(`You've posted ${reward.messageCount} messages this week!\n\nEarned **${reward.amount}** <:zyn_pouch:1310283145325707264>`)
                  .setTimestamp()
              ]
            });
          } catch (e) {
            // Silently fail if DM can't be sent
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in handleMessageCreate:', error);
  }
}

// ==================== BUTTON INTERACTIONS ====================

async function handleButtonInteraction(interaction) {
  try {
    const customId = interaction.customId;

    if (customId === 'claim_daily') {
      return await handleClaimDaily(interaction);
    } else if (customId === 'claim_roles') {
      return await handleClaimRoles(interaction);
    } else if (customId === 'view_credits') {
      return await handleViewCredits(interaction);
    }
  } catch (error) {
    console.error('Error in handleButtonInteraction:', error);
    await interaction.reply({
      content: '❌ Error processing button',
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  }
}

async function handleClaimDaily(interaction) {
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
        .setDescription(`You earned **${result.amount}** <:zyn_pouch:1310283145325707264>\n\n**Streak:** ${result.streak}/6`)
        .setThumbnail('https://cdn.discordapp.com/emojis/1310283145325707264.webp?size=128')
        .setTimestamp()
    ]
  });
}

async function handleClaimRoles(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const config = await creditSystem.getTasksConfig();

  if (!config?.roleRewards || config.roleRewards.length === 0) {
    await interaction.editReply('❌ No role rewards configured');
    return;
  }

  // Get user's roles
  const userRoles = interaction.member.roles.cache.map(r => r.id);
  const eligibleRewards = config.roleRewards.filter(r => userRoles.includes(r.roleId));

  if (eligibleRewards.length === 0) {
    await interaction.editReply('❌ You don\'t have any roles with rewards');
    return;
  }

  let totalEarned = 0;
  const claimedToday = [];

  for (const reward of eligibleRewards) {
    const result = await creditSystem.claimRoleReward(interaction.user.id, reward.roleId);
    if (result.success) {
      totalEarned += result.amount;
      claimedToday.push(`<@&${reward.roleId}>: ${result.amount} <:zyn_pouch:1310283145325707264>`);
    }
  }

  if (totalEarned === 0) {
    await interaction.editReply('ℹ️ You already claimed role rewards today');
    return;
  }

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Role Rewards Claimed!')
        .setDescription(claimedToday.join('\n'))
        .addFields({ name: 'Total Earned', value: `${totalEarned} <:zyn_pouch:1310283145325707264>` })
        .setTimestamp()
    ]
  });
}

async function handleViewCredits(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const user = await creditSystem.getCredits(interaction.user.id);

  const embed = new EmbedBuilder()
    .setColor(0x8a2be2)
    .setTitle('💰 Your Credits')
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      { name: 'Current Balance', value: `${user?.balance || 0} <:zyn_pouch:1310283145325707264>`, inline: true },
      { name: 'Total Earned', value: `${user?.totalEarned || 0} <:zyn_pouch:1310283145325707264>`, inline: true },
      { name: 'Total Spent', value: `${user?.totalSpent || 0} <:zyn_pouch:1310283145325707264>`, inline: true },
      { name: 'Daily Streak', value: `${user?.dailyStreak || 0}/6`, inline: true },
      { name: 'Messages This Week', value: `${user?.messageCountThisWeek || 0}`, inline: true },
      { name: 'Server Boosts', value: `${user?.boostCount || 0}`, inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

// ==================== SHOP SELECT MENU ====================

async function handleShopSelectMenu(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const itemId = interaction.values[0];
    const config = await creditSystem.getShopConfig();
    const item = config?.items?.find(i => i.id === itemId);

    if (!item) {
      await interaction.editReply('❌ Item not found');
      return;
    }

    // Process purchase
    const result = await creditSystem.purchaseItem(interaction.user.id, itemId);

    if (!result.success) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Purchase Failed')
            .setDescription(result.message)
        ]
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ Purchase Successful!')
          .addFields(
            { name: 'Item', value: `${item.emoji} ${item.name}`, inline: true },
            { name: 'Cost', value: `${item.price} <:zyn_pouch:1310283145325707264>`, inline: true },
            { name: 'New Balance', value: `${result.newBalance} <:zyn_pouch:1310283145325707264>`, inline: true }
          )
          .setTimestamp()
      ]
    });

    // Optional: Send purchase log to admin channel
    // You can add a PURCHASE_LOG_CHANNEL_ID to .env for this
  } catch (error) {
    console.error('Error in handleShopSelectMenu:', error);
    await interaction.editReply('❌ Error processing purchase');
  }
}

// ==================== BOOST TRACKING ====================

async function handleGuildMemberUpdate(oldMember, newMember) {
  try {
    // Check if boost status changed
    const oldBoostStatus = oldMember.premiumSince;
    const newBoostStatus = newMember.premiumSince;

    // User just boosted
    if (!oldBoostStatus && newBoostStatus) {
      const result = await creditSystem.recordBoost(newMember.id);

      if (result.success) {
        try {
          await newMember.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎉 Thanks for Boosting!')
                .setDescription(`You earned **${result.amount}** <:zyn_pouch:1310283145325707264> for boosting the server!\n\nTotal boosts: ${result.totalBoosts}`)
                .setTimestamp()
            ]
          });
        } catch (e) {
          // Silently fail if DM can't be sent
        }
      }
    }
  } catch (error) {
    console.error('Error in handleGuildMemberUpdate:', error);
  }
}

// ==================== INVITE TRACKING ====================

async function handleInviteCreate(invite) {
  try {
    if (!invite.inviter) return;

    // This tracks when invites are created, but not when they're used
    // To track actual usage, you'd need to periodically check invite counts
    // This is a placeholder for more advanced implementation
  } catch (error) {
    console.error('Error in handleInviteCreate:', error);
  }
}

// ==================== MODAL SUBMISSIONS ====================

async function handleModalSubmit(interaction) {
  try {
    const customId = interaction.customId;

    if (customId === 'edit_tasks_modal') {
      return await handleEditTasksModal(interaction);
    } else if (customId === 'config_shop_modal') {
      return await handleConfigShopModal(interaction);
    }
  } catch (error) {
    console.error('Error in handleModalSubmit:', error);
    await interaction.reply({
      content: '❌ Error processing modal',
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  }
}

async function handleEditTasksModal(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const config = await creditSystem.getTasksConfig() || {};

  try {
    const roleRewardsStr = interaction.fields.getTextInputValue('role_rewards_json');
    if (roleRewardsStr) {
      config.roleRewards = JSON.parse(roleRewardsStr);
    }
  } catch (e) {
    await interaction.editReply('❌ Invalid role rewards JSON');
    return;
  }

  try {
    const messageRewardsStr = interaction.fields.getTextInputValue('message_rewards_json');
    if (messageRewardsStr) {
      config.messageRewards = JSON.parse(messageRewardsStr);
    }
  } catch (e) {
    await interaction.editReply('❌ Invalid message rewards JSON');
    return;
  }

  await creditSystem.setTasksConfig(config);

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Tasks Updated')
        .setDescription('Your task rewards have been updated successfully!')
    ]
  });
}

async function handleConfigShopModal(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const config = await creditSystem.getShopConfig() || {};

  const storeName = interaction.fields.getTextInputValue('store_name');
  const storeDescription = interaction.fields.getTextInputValue('store_description');
  const storeLogo = interaction.fields.getTextInputValue('store_logo');
  const storeThumbnail = interaction.fields.getTextInputValue('store_thumbnail');

  if (storeName) config.storeName = storeName;
  if (storeDescription) config.storeDescription = storeDescription;
  if (storeLogo) config.logo = storeLogo;
  if (storeThumbnail) config.thumbnail = storeThumbnail;

  await creditSystem.setShopConfig(config);

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Shop Configured')
        .setDescription('Your shop settings have been updated successfully!')
        .addFields(
          { name: 'Store Name', value: config.storeName || 'Not set' },
          { name: 'Has Logo', value: config.logo ? '✅ Yes' : '❌ No' },
          { name: 'Has Thumbnail', value: config.thumbnail ? '✅ Yes' : '❌ No' }
        )
    ]
  });
}

module.exports = {
  handleMessageCreate,
  handleButtonInteraction,
  handleShopSelectMenu,
  handleGuildMemberUpdate,
  handleInviteCreate,
  handleModalSubmit
};
