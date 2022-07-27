const { SelectMenuBuilder, ActionRowBuilder, PermissionsBitField, ComponentType, ChannelType } = require("discord.js");
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
        const permissions = guild.members.me.permissions;
        if (!permissions.has(PermissionsBitField.FLAGS.ManageRoles)) return interaction.reply({ content: `I do not have the \`MANAGE_ROLES\` permission . Please grant me the permission before using this command.`, ephemeral: true });
        if (!permissions.has(PermissionsBitField.FLAGS.ManageWebhooks)) return interaction.reply({ content: `I do not have the \`MANAGE_WEBHOOKS\` permission . Please grant me the permission before using this command.`, ephemeral: true });
        if (!permissions.has(PermissionsBitField.FLAGS.ManageChannels)) return interaction.reply({ content: `I do not have the \`MANAGE_CHANNELS\` permission . Please grant me the permission before using this command.`, ephemeral: true });
        if (!permissions.has(PermissionsBitField.FLAGS.UseExternalEmojis)) return interaction.reply({ content: `I do not have the \`USE_EXTERNAL_EMOJIS\` permission . Please grant me the permission before using this command.`, ephemeral: true });
        if (!permissions.has(PermissionsBitField.FLAGS.SendMessages)) return interaction.reply({ content: `I do not have the \`SEND_MESSAGES\` permission . Please grant me the permission before using this command.`, ephemeral: true });
      };
      await interaction.deferReply({ ephemeral: true });
      if (!interaction.memberPermissions?.has(PermissionsBitField.FLAGS.Administrator) && !interaction.memberPermissions?.has(PermissionsBitField.FLAGS.ManageGuild) && interaction.user.id !== interaction.guild?.ownerId) return interaction.editReply({
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
      const row = new ActionRowBuilder()
        .addComponents(
          new SelectMenuBuilder()
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
      const collector = reply.createMessageComponentCollector({ filter, componentType: ComponentType.SelectMenu, time: 1000 * 60 * 60 * 24 });
      collector.on('collect', async (i) => {
        await i.deferUpdate();
        if (i.user.id !== userid) return i.reply({ content: `This menu is not for you.`, ephemeral: true });
        const value = i.values[0];
        chosen = Number(value);
        const replace = await config_records.findOne({
          discord_id: interaction.user.id,
          number: chosen,
        });
        const category = await interaction.guild.channels.create({
          name: "🛒 BoBot Sales 🛒", 
          type: ChannelType.GuildCategory
        });
        const stats_channel = await interaction.guild.channels.create({
          name:"📈︱stats", 
          parent: category,
          topic: "Stats channel Managed by BoBot Sales Bot : https://discord.gg/HweZtrzAnX",
          permissionOverwrites: [
            {
              id: client.user.id,
              allow: [PermissionsBitField.FLAGS.ViewChannel, PermissionsBitField.FLAGS.SendMessages, PermissionsBitField.FLAGS.EmbedLinks],
            }, {
              id: interaction.guild.id,
              deny: [PermissionsBitField.FLAGS.ViewChannel],
            }
          ],
        });
        const sales_channel = await interaction.guild.channels.create({
          name:"📈︱sales", 
          topic: "Sales channel Managed by BoBot Sales Bot : https://discord.gg/HweZtrzAnX",
          parent: category,
          permissionOverwrites: [
            {
              id: client.user.id,
              allow: [PermissionsBitField.FLAGS.ViewChannel, PermissionsBitField.FLAGS.SendMessages, PermissionsBitField.FLAGS.EmbedLinks],
            }, {
              id: interaction.guild.id,
              deny: [PermissionsBitField.FLAGS.ViewChannel],
            }
          ],
        });
        const listings_channel = await interaction.guild.channels.create({
          name:"📈︱listings", 
          parent: category,
          topic: "Listings Channel Managed by BoBot Sales Bot : https://discord.gg/HweZtrzAnX",
          permissionOverwrites: [
            {
              id: client.user.id,
              allow: [PermissionsBitField.FLAGS.ViewChannel, PermissionsBitField.FLAGS.SendMessages, PermissionsBitField.FLAGS.EmbedLinks],
            }, {
              id: interaction.guild.id,
              deny: [PermissionsBitField.FLAGS.ViewChannel],
            }
          ],
        });
        if (role.id === interaction.guild.id) {
          await stats_channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: true, SendMessages: false, ReadMessageHistory: true, AddReactions: true, UseExternalEmojis: true });
          await sales_channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: true, SendMessages: false, ReadMessageHistory: true, AddReactions: true, UseExternalEmojis: true });
          await listings_channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: true, SendMessages: false, ReadMessageHistory: true, AddReactions: true, UseExternalEmojis: true });
        } else {
          await stats_channel.permissionOverwrites.create(role.id, { ViewChannel: true, SendMessages: false, ReadMessageHistory: true, AddReactions: true, UseExternalEmojis: true });
          await sales_channel.permissionOverwrites.create(role.id, { ViewChannel: true, SendMessages: false, ReadMessageHistory: true, AddReactions: true, UseExternalEmojis: true });
          await listings_channel.permissionOverwrites.create(role.id, { ViewChannel: true, SendMessages: false, ReadMessageHistory: true, AddReactions: true, UseExternalEmojis: true });
        };
        const sales_webhook = await sales_channel.createWebhook({
          name:'BoBot Sales S',
          avatar: "https://media.discordapp.net/attachments/797163839765741568/988519804472287332/sales.jpg",
          reason: "This webhook was created by BoBot Sales Bot to post sales.",
        });
        const listings_webhook = await listings_channel.createWebhook({
          name:'BoBot Sales L', 
          avatar: "https://media.discordapp.net/attachments/797163839765741568/988519804472287332/sales.jpg",
          reason: "This webhook was created by BoBot Sales Bot to post listings.",
        });
        const stats_webhook = await stats_channel.createWebhook({
          name:'BoBot Sales Stats',
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