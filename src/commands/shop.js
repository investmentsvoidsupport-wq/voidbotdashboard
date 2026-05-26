// src/commands/shop.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const creditSystem = require('../utils/creditSystem');

// ==================== BUILD SHOP EMBED ====================

function buildShopEmbed(config) {
  const embed = new EmbedBuilder()
    .setTitle(`🛍️ ${config?.storeName || 'Void Shop'}`)
    .setDescription(config?.storeDescription || 'Purchase exclusive items and perks with your Void Credits!')
    .setColor(0x8a2be2);

  if (config?.logo) {
    embed.setThumbnail(config.logo);
  }

  if (config?.thumbnail) {
    embed.setImage(config.thumbnail);
  }

  return embed;
}

function buildItemSelectMenu(items) {
  const options = items.slice(0, 25).map((item, index) => ({
    label: item.name.substring(0, 100),
    value: item.id,
    description: `${item.price} credits${item.description ? ' - ' + item.description.substring(0, 97) : ''}`.substring(0, 100),
    emoji: item.emoji || '🛍️'
  }));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('shop_select')
      .setPlaceholder('Select an item to purchase')
      .addOptions(options)
  );
}

// ==================== SETUP COMMAND ====================

const shopCommand = new SlashCommandBuilder()
  .setName('shop')
  .setDescription('Manage the shop')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false)
  .addSubcommand(sub => sub
    .setName('setup')
    .setDescription('Set up the shop panel')
  )
  .addSubcommand(sub => sub
    .setName('additem')
    .setDescription('Add an item to the shop')
    .addStringOption(opt => opt
      .setName('name')
      .setDescription('Item name')
      .setRequired(true)
    )
    .addIntegerOption(opt => opt
      .setName('price')
      .setDescription('Item price in credits')
      .setRequired(true)
    )
    .addStringOption(opt => opt
      .setName('description')
      .setDescription('Item description')
      .setRequired(false)
    )
    .addStringOption(opt => opt
      .setName('emoji')
      .setDescription('Item emoji')
      .setRequired(false)
    )
  )
  .addSubcommand(sub => sub
    .setName('removeitem')
    .setDescription('Remove an item from the shop')
    .addStringOption(opt => opt
      .setName('itemid')
      .setDescription('Item ID to remove')
      .setRequired(true)
    )
  )
  .addSubcommand(sub => sub
    .setName('config')
    .setDescription('Configure shop settings')
  )
  .addSubcommand(sub => sub
    .setName('list')
    .setDescription('List all shop items')
  );

async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'setup') {
    return await setupShop(interaction);
  } else if (subcommand === 'additem') {
    return await addItem(interaction);
  } else if (subcommand === 'removeitem') {
    return await removeItem(interaction);
  } else if (subcommand === 'config') {
    return await configShop(interaction);
  } else if (subcommand === 'list') {
    return await listItems(interaction);
  }
}

async function setupShop(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const config = await creditSystem.getShopConfig();

    if (!config?.items || config.items.length === 0) {
      await interaction.editReply('❌ No items in shop. Add items first with `/shop additem`');
      return;
    }

    const embed = buildShopEmbed(config);
    const selectMenu = buildItemSelectMenu(config.items);

    const shopChannelId = process.env.SHOP_CHANNEL_ID || interaction.channelId;
    const channel = await interaction.client.channels.fetch(shopChannelId).catch(() => null);

    if (!channel) {
      await interaction.editReply('❌ Shop channel not found. Set SHOP_CHANNEL_ID in .env');
      return;
    }

    // Add item details to embed
    let itemListText = '';
    config.items.slice(0, 10).forEach(item => {
      itemListText += `**${item.emoji || '🛍️'} ${item.name}** - ${item.price} <:zyn_pouch:1310283145325707264>\n`;
      if (item.description) itemListText += `*${item.description}*\n\n`;
    });

    if (config.items.length > 10) {
      itemListText += `*...and ${config.items.length - 10} more items*`;
    }

    embed.addFields({
      name: '📦 Available Items',
      value: itemListText || 'No items yet',
      inline: false
    });

    await channel.send({
      embeds: [embed],
      components: [selectMenu]
    });

    await interaction.editReply(`✅ Shop panel posted! (${config.items.length} items)`);
  } catch (error) {
    console.error('Error in setupShop:', error);
    await interaction.editReply('❌ Error setting up shop');
  }
}

async function addItem(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const name = interaction.options.getString('name');
    const price = interaction.options.getInteger('price');
    const description = interaction.options.getString('description') || '';
    const emoji = interaction.options.getString('emoji') || '🛍️';

    const config = await creditSystem.getShopConfig() || { items: [] };
    const itemId = `item_${Date.now()}`;

    const newItem = {
      id: itemId,
      name,
      price,
      description,
      emoji,
      createdAt: new Date()
    };

    config.items = config.items || [];
    config.items.push(newItem);

    await creditSystem.setShopConfig(config);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ Item Added')
          .setDescription(`**${emoji} ${name}** added to shop for ${price} <:zyn_pouch:1310283145325707264>`)
          .addFields({ name: 'Item ID', value: itemId, inline: false })
      ]
    });
  } catch (error) {
    console.error('Error in addItem:', error);
    await interaction.editReply('❌ Error adding item');
  }
}

async function removeItem(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const itemId = interaction.options.getString('itemid');
    const config = await creditSystem.getShopConfig();

    if (!config?.items) {
      await interaction.editReply('❌ Shop not configured');
      return;
    }

    const itemIndex = config.items.findIndex(i => i.id === itemId);

    if (itemIndex === -1) {
      await interaction.editReply('❌ Item not found');
      return;
    }

    const removedItem = config.items.splice(itemIndex, 1)[0];
    await creditSystem.setShopConfig(config);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('✅ Item Removed')
          .setDescription(`**${removedItem.emoji} ${removedItem.name}** removed from shop`)
      ]
    });
  } catch (error) {
    console.error('Error in removeItem:', error);
    await interaction.editReply('❌ Error removing item');
  }
}

async function configShop(interaction) {
  try {
    const modal = new ModalBuilder()
      .setCustomId('config_shop_modal')
      .setTitle('Configure Shop');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('store_name')
          .setLabel('Store Name')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Void Shop')
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('store_description')
          .setLabel('Store Description')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Purchase exclusive items with your credits!')
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('store_logo')
          .setLabel('Logo URL (PNG/JPG)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('https://example.com/logo.png')
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('store_thumbnail')
          .setLabel('Thumbnail URL (PNG/JPG)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('https://example.com/thumbnail.png')
          .setRequired(false)
      )
    );

    await interaction.showModal(modal);
  } catch (error) {
    console.error('Error in configShop:', error);
    await interaction.reply({ content: '❌ Error opening config', flags: MessageFlags.Ephemeral });
  }
}

async function listItems(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const config = await creditSystem.getShopConfig();

    if (!config?.items || config.items.length === 0) {
      await interaction.editReply('❌ No items in shop');
      return;
    }

    let itemList = '';
    config.items.forEach((item, index) => {
      itemList += `${index + 1}. **${item.emoji} ${item.name}** - ${item.price} <:zyn_pouch:1310283145325707264>\n`;
      if (item.description) itemList += `   *${item.description}*\n`;
      itemList += `   ID: \`${item.id}\`\n\n`;
    });

    const chunks = [];
    let currentChunk = '';

    for (const line of itemList.split('\n')) {
      if ((currentChunk + line).length > 1024) {
        chunks.push(currentChunk.trim());
        currentChunk = line;
      } else {
        currentChunk += line + '\n';
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    const embed = new EmbedBuilder()
      .setColor(0x8a2be2)
      .setTitle(`📦 Shop Inventory (${config.items.length} items)`);

    chunks.forEach((chunk, idx) => {
      embed.addFields({
        name: idx === 0 ? 'Items' : 'Items (continued)',
        value: chunk,
        inline: false
      });
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in listItems:', error);
    await interaction.editReply('❌ Error listing items');
  }
}

module.exports = { data: shopCommand, execute };
