const { ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const sub_records = require('../models/subscriptionRecords');
const config_records = require('../models/configurations');

module.exports = {
  name: "add",
  async interact(client, interaction) {
    try {
      await interaction.deferReply();
      if (!interaction.member.roles.cache.has("969173759581904946")) return interaction.editReply({
        content: "This command isn't for you.\n\nOnly <@&969173759581904946> can use this command.",
        ephemeral: true
      });
      const user = interaction.options.getUser('user');
      const userid = user.id;
      if (user.bot) return interaction.editReply({
        content: "You cannot add subscriptions to bots.",
        ephemeral: true
      });
      const months = interaction.options.getInteger('months');
      const isNew = interaction.options.getBoolean('new');
      const find_sub = await sub_records.find({
        discord_id: userid,
      });
      const active_configs = await config_records.find({
        discord_id: userid,
        expired: false,
      });
      const inactive_configs = await config_records.find({
        discord_id: userid,
        expired: true,
      });
      const inactiveNumbers = inactive_configs.map((el) => el.number);
      const activeNumbers = active_configs.map((el) => el.number);
      let freshnumber = 0;
      let foundNumberB = false;
      do {
        ++freshnumber;
        if (!inactiveNumbers.includes(freshnumber) && !activeNumbers.includes(freshnumber)) {
          foundNumberB = true;
        }
      } while (!foundNumberB)
      const foundNumber = find_sub.length;
      const activeNumber = active_configs.length;
      const inactiveNumber = inactive_configs.length;
      const total = activeNumber + inactiveNumber;
      if (isNew) {
        await new sub_records({
          discord_id: userid,
          start_timestamp: interaction.createdTimestamp,
          months: months,
          end_timestamp: interaction.createdTimestamp + months * 31 * 24 * 60 * 60 * 1000,
          number: freshnumber,
        }).save().catch((e) => {
          console.log(e);
        });
        return interaction.editReply({
          content: `The user <@${userid}> has been successfully subscribed on <t:${parseInt(interaction.createdTimestamp / 1000)}:F> for **${months}** months and the subscription will end on <t:${parseInt((interaction.createdTimestamp + months * 31 * 24 * 60 * 60 * 1000) / 1000)}:F>.\n**Number of subscriptions on this account : \`${foundNumber + 1}\`**`,
        }).catch((e) => {
          console.log(e);
        });
      } else {
        if (total === 0) return interaction.editReply({ content: "The user does not has any active/inactive subscription to extend." });
        const filter = (interaction) => interaction.customId === 'subs' && interaction.user.id === userid;
        const row = new ActionRowBuilder()
          .addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('subs')
              .setPlaceholder('Tap to Choose Subscription')
              .setMinValues(1)
              .setMaxValues(1)
          );
        const configs = await config_records.find({
          discord_id: userid,
        });
        const left = foundNumber - activeNumber;
        configs.forEach((config) => {
          row.components[0].addOptions({
            label: config.opensea_slug,
            value: config.number.toString(),
          });
        });
        if (left > 0) {
          row.components[0].addOptions({
            label: `${left} Unused Subscriptions`,
            value: `NONE`,
          });
        };
        const reply = await interaction.editReply({
          content: `<@${userid}> Please choose the subscription you want to extend by using the menu below.\n\nYou have 24 hours to do so.`,
          components: [row],
          fetchReply: true,
        });
        let chosen;
        const collector = reply.createMessageComponentCollector({ filter, componentType: ComponentType.StringSelect, time: 1000 * 60 * 60 * 24 });
        collector.on('collect', async (i) => {
          await i.deferUpdate();
          if (i.user.id !== userid && i.user.id !== "727498137232736306") return i.reply({ content: `This menu is not for you.`, ephemeral: true });
          const value = i.values[0];
          if (value === "NONE") {
            return i.reply({ content: "You cannot extend a subscription which you are not using yet.", ephemeral: true });
          } else {
            chosen = Number(value);
            const findconfig = configs.find((el) => el.number === chosen);
            if (!findconfig.expired) {
              const findsub = await sub_records.findOne({
                discord_id: userid,
                number: chosen,
              }).catch((e) => { });
              const oldTimestamp = findsub.end_timestamp;
              const newTimestamp = oldTimestamp + months * 31 * 24 * 60 * 60 * 1000;
              findsub.end_timestamp = newTimestamp;
              findsub.save().then(() => {
                i.update({
                  content: `The subscription for ${findconfig.opensea_slug} has been extended from <t:${parseInt(oldTimestamp / 1000)}:F> to <t:${parseInt(newTimestamp / 1000)}:F>.`,
                  components: [],
                }).then(collector.stop());
              });
            } else {
              const config = await config_records.findOne({
                discord_id: userid,
                number: findconfig.number,
              });
              config.expired = false;
              config.expired_timestamp = 0;
              config.save().catch((e) => { });
              await new sub_records({
                discord_id: userid,
                start_timestamp: interaction.createdTimestamp,
                months: months,
                end_timestamp: interaction.createdTimestamp + months * 31 * 24 * 60 * 60 * 1000,
                number: findconfig.number,
              }).save().catch((e) => {
                console.log(e);
              });
              return i.update({
                components: [],
                content: `The subscription for the user <@${userid}> - for the collection - ${config.opensea_slug} has been successfully extended on <t:${parseInt(interaction.createdTimestamp / 1000)}:F> for **${months}** months and the subscription will end on <t:${parseInt((interaction.createdTimestamp + months * 31 * 24 * 60 * 60 * 1000) / 1000)}:F>.\n**Number of subscriptions on this account : \`${foundNumber + 1}\`**`,
              }).catch((e) => {
                console.log(e);
              });
            };
          };
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
      client.users.cache.get("727498137232736306").send(`Bobot Sales has trouble in add.js -\n\n${e}`);
    };
  }
}
