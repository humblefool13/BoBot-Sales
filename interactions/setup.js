const { MessageEmbed, MessageActionRow, MessageButton, Permissions } = require("discord.js");
const sub_records = require('../models/subscriptionRecords');
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
  name: "setup",
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
      let contract_address = "NA", magiceden_symbol = "NA";
      let number = 0;
      let big = false;
      const chain = interaction.options.getString('chain');
      const role = interaction.options.getRole('base_role');
      const size = interaction.options.getString('image_size');
      const opensea_link = interaction.options.getString('opensea_link');
      const opensea_slug = opensea_link.trim().slice(opensea_link.lastIndexOf("/") + 1);
      let OS_data;
      do {
        OS_data = await getOSdata(opensea_slug);
      } while (!OS_data || !Array.isArray(OS_data))
      const customisation = [OS_data[1], OS_data[2]];
      const findsubs = await sub_records.find({
        discord_id: interaction.user.id,
      });
      const findcollection = await config_records.findOne({
        discord_id: interaction.user.id,
        opensea_slug: opensea_slug,
        expired: false,
      });
      let findconfigs = await config_records.find({
        discord_id: interaction.user.id,
        expired: false,
      });
      const configs = await config_records.find({
        discord_id: interaction.user.id,
      });
      if (!findsubs.length) return interaction.editReply({
        content: "You do not have a subscription . Please contact us at our [support server](https://discord.gg/HweZtrzAnX) to get a subscription.",
        ephemeral: true,
      });
      if (findsubs.length === findconfigs.length && !findcollection) return interaction.editReply({
        content: "You have a collection setup for every subscription you have . You can either\n1) Get a new subscription for a new collection ,\n2) Replace an exising collection by a new one using \`/replace\` command . This will stop posting for old collection and old channels will stop working.",
        ephemeral: true,
      });
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
      if (!findcollection) {
        const numbersSubs = findsubs.map((el) => el.number);
        const numbersConfigs = configs.map((el) => el.number);
        numbersSubs.forEach((num) => {
          if (number > 0) return;
          if (numbersConfigs.includes(num)) return;
          number = num;
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
          await sales_channel.permissionOverwrites.edit(interaction.guild.id, { VIEW_CHANNEL: true, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: true, ADD_REACTIONS: true, USE_EXTERNAL_EMOJIS: true });
          await listings_channel.permissionOverwrites.edit(interaction.guild.id, { VIEW_CHANNEL: true, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: true, ADD_REACTIONS: true, USE_EXTERNAL_EMOJIS: true });
          await stats_channel.permissionOverwrites.edit(interaction.guild.id, { VIEW_CHANNEL: true, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: true, ADD_REACTIONS: true, USE_EXTERNAL_EMOJIS: true });
        } else {
          await sales_channel.permissionOverwrites.create(role.id, { VIEW_CHANNEL: true, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: true, ADD_REACTIONS: true, USE_EXTERNAL_EMOJIS: true });
          await listings_channel.permissionOverwrites.create(role.id, { VIEW_CHANNEL: true, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: true, ADD_REACTIONS: true, USE_EXTERNAL_EMOJIS: true });
          await stats_channel.permissionOverwrites.create(role.id, { VIEW_CHANNEL: true, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: true, ADD_REACTIONS: true, USE_EXTERNAL_EMOJIS: true });
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
        await new config_records({
          number: number,
          discord_id: interaction.user.id,
          server_id: interaction.guild.id,
          sale_channel: sales_channel.id,
          list_channel: listings_channel.id,
          sales_webhook_id: sales_webhook.id,
          listings_webhook_id: listings_webhook.id,
          chain: chain,
          opensea_slug: opensea_slug,
          expired: false,
          expired_timestamp: 0,
          big: big,
          magiceden_symbol: magiceden_symbol,
          contract_address: contract_address,
          collection_name: customisation[0] + " | BoBot",
          collection_pfp: customisation[1],
          stats_channel: stats_channel.id,
          stats_webhook_id: stats_webhook.id,
          stats_webhook_message_id: stats_message.id,
        }).save().catch((e) => {
          console.log(e)
        });
        const everyonePermissions = interaction.guild.roles.everyone.permissions;
        if (!everyonePermissions.has(Permissions.FLAGS.USE_EXTERNAL_EMOJIS)) {
          await interaction.guild.roles.everyone.permissions.add(Permissions.FLAGS.USE_EXTERNAL_EMOJIS);
        };
        return interaction.editReply({
          content: `The stats, sales and listings channels are set at <#${stats_channel.id}>, <#${sales_channel.id}> & <#${listings_channel.id}>. The bot will start posting stats, sales and listings soon . \n\nYou can rename the channels or move them to other categories but please do not make any changes in channels' permissions else it might affect functionality of bot.`,
          ephemeral: true,
        });
      } else {
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
          await sales_channel.permissionOverwrites.edit(interaction.guild.id, { VIEW_CHANNEL: true, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: true, ADD_REACTIONS: true, USE_EXTERNAL_EMOJIS: true });
          await stats_channel.permissionOverwrites.edit(interaction.guild.id, { VIEW_CHANNEL: true, SEND_MESSAGES: false, READ_MESSAGE_HISTORY: true, ADD_REACTIONS: true, USE_EXTERNAL_EMOJIS: true });
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
        findcollection.server_id = interaction.guild.id;
        findcollection.sale_channel = sales_channel.id;
        findcollection.list_channel = listings_channel.id;
        findcollection.sales_webhook_id = sales_webhook.id;
        findcollection.listings_webhook_id = listings_webhook.id;
        findcollection.collection_name = customisation[0] + " | BoBot";
        findcollection.collection_pfp = customisation[1];
        findcollection.big = big;
        findcollection.stats_channel = stats_channel.id;
        findcollection.stats_webhook_id = stats_webhook.id;
        findcollection.stats_webhook_message_id = stats_message.id;
        findcollection.save().then(() => {
          const everyonePermissions = interaction.guild.roles.everyone.permissions;
          if (!everyonePermissions.has(Permissions.FLAGS.USE_EXTERNAL_EMOJIS)) {
            interaction.guild.roles.everyone.permissions.add(Permissions.FLAGS.USE_EXTERNAL_EMOJIS);
          };
          return interaction.editReply({
            content: `You have re-setup your configuration for ${findcollection.opensea_slug} . The old channels will stop working and the bot will start with the freshly made channels - <#${stats_channel.id}>, <#${sales_channel.id}> & <#${listings_channel.id}> . The bot will start posting sales and listings soon .\n\nYou can rename the channel or move them to other categories but please do not make any changes in channels' permissions else it might affect functionality of bot.`,
            ephemeral: true,
          })
        });
      };
    } catch (e) {
      console.log(e);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: "I am facing some issues , the dev has been informed . Please try again in some hours.",
          embeds: [],
          components: [],
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "I am facing some issues , the dev has been informed . Please try again in some hours.",
          embeds: [],
          components: [],
          ephemeral: true,
        });
      };
      client.users.cache.get("727498137232736306").send(`Bobot Sales has trouble in setup.js -\n\n${e}`);
    };
  },
};