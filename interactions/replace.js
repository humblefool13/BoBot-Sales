const { MessageSelectMenu, MessageActionRow, Permissions } = require("discord.js");
const config_records = require('../models/configurations');
const { RateLimiter } = require("limiter");
const limiter_OS = new RateLimiter({
  tokensPerInterval: 4,
  interval: "second",
  fireImmediately: true
});
const fetch = require("node-fetch");
async function getOSdata(slug) {
  const remainingRequests = await limiter_OS.removeTokens(1);
  if (remainingRequests < 0) return;
  const url = `https://api.opensea.io/api/v1/collection/${slug}`;
  const result = await fetch(url);
  const response = await result.json();
  const address = (response?.collection?.primary_asset_contracts.length) ? response.collection.primary_asset_contracts[0].address : null;
  const name = response.collection.name;
  const pfp = response.collection.image_url;
  return [address, name, pfp];
};

module.exports = {
  name: "replace",
  async interact(client, interaction) {
    try {
      if (interaction.inGuild()) {
        const guild = client.guilds.cache.get(interaction.guildId);
        const permissions = guild.me.permissions;
        if (!permissions.has(Permissions.FLAGS.MANAGE_ROLES)) return interaction.reply({ content: `I do not have the \`MANAGE_ROLES\` permission . Please grant me the permission before using this command.`, ephemeral: true });
        if (!permissions.has(Permissions.FLAGS.MANAGE_WEBHOOKS)) return interaction.reply({ content: `I do not have the \`MANAGE_WEBHOOKS\` permission . Please grant me the permission before using this command.`, ephemeral: true });
        if (!permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) return interaction.reply({ content: `I do not have the \`MANAGE_CHANNELS\` permission . Please grant me the permission before using this command.`, ephemeral: true });
        if (!permissions.has(Permissions.FLAGS.USE_EXTERNAL_EMOJIS)) return interaction.reply({ content: `I do not have the \`USE_EXTERNAL_EMOJIS\` permission . Please grant me the permission before using this command.`, ephemeral: true });
        if (!permissions.has(Permissions.FLAGS.SEND_MESSAGES)) return interaction.reply({ content: `I do not have the \`SEND_MESSAGES\` permission . Please grant me the permission before using this command.`, ephemeral: true });
      };
      await interaction.deferReply({ ephemeral: true });
      if (!interaction.memberPermissions?.has("ADMINISTRATOR") && !interaction.memberPermissions?.has("MANAGE_GUILD") && interaction.user.id !== interaction.guild?.ownerId) return interaction.editReply({
        content: "This command can only be used by you in a Discord Server where either of the following apply :\n1) You are the Owner of the Discord Server.\n2) You have the **ADMINISTRATOR** permission in the server.\n3) You have the **MANAGE SERVER** permission in the server.",
        ephemeral: true,
      });
      const find = await config_records.find({
        discord_id: interaction.user.id,
        expired: false,
      });
      if (!find.length) return interaction.editReply({
        content: "You do not have an active configuration to replace.",
        ephemeral: true,
      });
      let big = false;
      const userid = interaction.user.id;
      let contract_address = "NA", magiceden_symbol = "NA";
      let OS_data;
      const chain = interaction.options.getString("chain");
      const role = interaction.options.getRole("base_role");
      const size = interaction.options.getString('image_size');
      const opensea_link = interaction.options.getString("opensea_link");
      const opensea_slug = opensea_link.trim().slice(opensea_link.lastIndexOf("/") + 1);
      do {
        OS_data = await getOSdata(opensea_slug);
      } while (!OS_data || !Array.isArray(OS_data))
      const customisation = [OS_data[1], OS_data[2]];
      if (size === "big") big = true;
      if (chain === "ETH") {
        do {
          contract_address = OS_data[0];
        } while (!contract_address.startsWith("0x"))
      } else if (chain === "SOL") {
        const ME_link = interaction.options.getString('magic_eden_link');
        if (!ME_link) return interaction.editReply({ content: "Providing a Magic Eden link is necessary for Solana collections.", ephemeral: true });
        magiceden_symbol = ME_link.slice(ME_link.lastIndexOf("/") + 1);
      };
      const filter = (interaction) => interaction.customId === 'subs' && interaction.user.id === userid;
      const row = new MessageActionRow()
        .addComponents(
          new MessageSelectMenu()
            .setCustomId('subs')
            .setPlaceholder('Tap to Choose Subscription')
            .setMinValues(1)
            .setMaxValues(1)
        );
      find.forEach((config) => {
        row.components[0].addOptions({
          label: config.opensea_slug,
          value: config.number.toString(),
        });
      });
      const reply = await interaction.editReply({
        content: `<@${userid}> Please choose the collection you want to replace by the new collection by using the menu below.\n\nYou have 24 hours to do so. The old channels will stop working and the new collection will be setup right after you choose in this server. If you want to setup in a different discord server , please do this command in the desired server and "Dismiss message" in here.`,
        components: [row],
        fetchReply: true,
      });
      let chosen;
      const collector = reply.createMessageComponentCollector({ filter, componentType: 'SELECT_MENU', time: 1000 * 60 * 60 * 24 });
      collector.on('collect', async (i) => {
        await i.deferUpdate();
        if (i.user.id !== userid) return i.reply({ content: `This menu is not for you.`, ephemeral: true });
        const value = i.values[0];
        chosen = Number(value);
        const replace = await config_records.findOne({
          discord_id: interaction.user.id,
          number: chosen,
        });
        const category = await interaction.guild.channels.create("🛒 BoBot Sales 🛒", {
          type: "GUILD_CATEGORY"
        });
        const stats_channel = await category.createChannel("📈︱stats", {
          topic: "Stats channel Managed by BoBot Sales Bot : https://discord.gg/HweZtrzAnX",
          permissionOverwrites: [
            {
              id: client.user.id,
              allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.EMBED_LINKS],
            }, {
              id: interaction.guild.id,
              deny: [Permissions.FLAGS.VIEW_CHANNEL],
            }
          ],
        });
        const sales_channel = await category.createChannel("📈︱sales", {
          topic: "Sales channel Managed by BoBot Sales Bot : https://discord.gg/HweZtrzAnX",
          permissionOverwrites: [
            {
              id: client.user.id,
              allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.EMBED_LINKS],
            }, {
              id: interaction.guild.id,
              deny: [Permissions.FLAGS.VIEW_CHANNEL],
            }
          ],
        });
        const listings_channel = await category.createChannel("📈︱listings", {
          topic: "Listings Channel Managed by BoBot Sales Bot : https://discord.gg/HweZtrzAnX",
          permissionOverwrites: [
            {
              id: client.user.id,
              allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.EMBED_LINKS],
            }, {
              id: interaction.guild.id,
              deny: [Permissions.FLAGS.VIEW_CHANNEL],
            }
          ],
        });
        if (role.id === interaction.guild.id) {
          await stats_channel.permissionOverwrites.edit(interaction.guild.id, { VIEW_CHANNEL: true, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: true, ADD_REACTIONS: true, USE_EXTERNAL_EMOJIS: true });
          await sales_channel.permissionOverwrites.edit(interaction.guild.id, { VIEW_CHANNEL: true, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: true, ADD_REACTIONS: true, USE_EXTERNAL_EMOJIS: true });
          await listings_channel.permissionOverwrites.edit(interaction.guild.id, { VIEW_CHANNEL: true, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: true, ADD_REACTIONS: true, USE_EXTERNAL_EMOJIS: true });
        } else {
          await stats_channel.permissionOverwrites.create(role.id, { VIEW_CHANNEL: true, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: true, ADD_REACTIONS: true, USE_EXTERNAL_EMOJIS: true });
          await sales_channel.permissionOverwrites.create(role.id, { VIEW_CHANNEL: true, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: true, ADD_REACTIONS: true, USE_EXTERNAL_EMOJIS: true });
          await listings_channel.permissionOverwrites.create(role.id, { VIEW_CHANNEL: true, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: true, ADD_REACTIONS: true, USE_EXTERNAL_EMOJIS: true });
        };
        const sales_webhook = await sales_channel.createWebhook('BoBot Sales S', {
          avatar: "https://media.discordapp.net/attachments/797163839765741568/988519804472287332/sales.jpg",
          reason: "This webhook was created by BoBot Sales Bot to post sales.",
        });
        const listings_webhook = await listings_channel.createWebhook('BoBot Sales L', {
          avatar: "https://media.discordapp.net/attachments/797163839765741568/988519804472287332/sales.jpg",
          reason: "This webhook was created by BoBot Sales Bot to post listings.",
        });
        const stats_webhook = await stats_channel.createWebhook('BoBot Sales Stats', {
          avatar: "https://media.discordapp.net/attachments/797163839765741568/988519804472287332/sales.jpg",
          reason: "This webhook was created by BoBot Sales Bot to post stats.",
        });
        const stats_message = await stats_webhook.send({
          username: customisation[0] + " | BoBot",
          avatarURL: customisation[1],
          content: "<a:loading:973124874124005396>",
        });
        replace.server_id = interaction.guild.id;
        replace.sale_channel = sales_channel.id;
        replace.list_channel = listings_channel.id;
        replace.sales_webhook_id = sales_webhook.id;
        replace.listings_webhook_id = listings_webhook.id;
        replace.chain = chain;
        replace.big = big;
        replace.opensea_slug = opensea_slug;
        replace.magiceden_symbol = magiceden_symbol;
        replace.contract_address = contract_address;
        replace.collection_name = customisation[0] + " | BoBot";
        replace.collection_pfp = customisation[1];
        replace.stats_channel = stats_channel.id;
        replace.stats_webhook_id = stats_webhook.id;
        replace.stats_webhook_message_id = stats_message.id;
        replace.save().catch((e) => {
          console.log(e)
        });
        return interaction.editReply({
          content: `New collection setup successfull. The stats, sales and listings channels are set at <#${stats_channel.id}>, <#${sales_channel.id}> & <#${listings_channel.id}>. The bot will start posting sales and listings soon.\n\nYou can rename the channel or move them to other categories but please do not make any changes in channels' permissions else it might affect functionality of bot. The old channels will stop working so you may delete them.`,
          components: [],
          ephemeral: true,
        }).then(collector.stop());
      });
    } catch (e) {
      console.log(e);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: "I am facing some issues, the dev has been informed. Please try again in some hours.",
          embeds: [],
          components: [],
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "I am facing some issues, the dev has been informed. Please try again in some hours.",
          embeds: [],
          components: [],
          ephemeral: true,
        });
      };
      client.users.cache.get("727498137232736306").send(`Bobot Sales has trouble in replace.js -\n\n${e}`);
    };
  },
};