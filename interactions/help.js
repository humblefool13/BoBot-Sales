const {EmbedBuilder,ActionRowBuilder,ButtonBuilder,ComponentType,ChannelType,ButtonStyle} = require("discord.js");

module.exports = {
  name: "help",
  async interact(client, interaction) {
    try {
      const general = new EmbedBuilder()
        .setTitle("BoBot Sales Help")
        .setColor("#454be9")
        .setDescription("The Bot comes with the following commands :\n`/about` : About the Bot\n`/setup` : To setup your collection in your server \n`/help` : This command\n`/subscribe` : Learn more about subscriptions\n`/replace` : To change the collection you want to post sales and listings of - from this subscription , to use bot for multiple collections please contact us for another subscription!");
      const subscription = new EmbedBuilder()
        .setTitle("1) Subscription")
        .setColor("#454be9")
        .setDescription("To use the BoBot Sales , you would first need a valid subscription . To learn more about subscriptions use the `/subscribe` slash command .");
      const config = new EmbedBuilder()
        .setTitle("2) Setting Collection")
        .setColor("#454be9")
        .setDescription("You can use the `/setup` command to setup a collection to post sales and listings for . The bot asks for chain and opensea link of collection and after which it handles the rest . For Solana collections , Magic Eden link is required .");
      const refresh = new EmbedBuilder()
        .setTitle("3) Others")
        .setColor("#454be9")
        .setDescription("1) You can always change channel names and positions / categories as you want .\n**NOTE** - Deleting the channel(s) / changing bot permissions might stop the bot from working , you can `/setup` to start again with fresh channels.\n\n2) If you have setup a collection already and you set it up again , the old channels will stop working .\n\n3) What is the 'base role' in `/setup` ?\nThis was added to make sure you need to do nothing after setting the bot up using the `/setup` command and the bot can setup channel permissions as required . This is the role everyone gets after verifying in your server and the people having this role will be able to see the channels!\n\n");
      const more = new EmbedBuilder()
        .setTitle("4) Something Else")
        .setColor("#454be9")
        .setDescription("➭ Are you facing some issues ?\n➭ Did your subscription not validate ?\n➭ Have some feedback / suggestion ?\n**. . .**\n\nYou are always welcome to join our [discord support server](https://discord.gg/HweZtrzAnX 'Click to join the support server !') for anything you would like to talk to us regarding the bot !\nWe would love to hear from you !!!");
      const channel = await client.channels.fetch(interaction.channelId);
      if (channel.type === ChannelType.DM) {
        return interaction.reply({
          embeds: [general, subscription, config, refresh, more],
          ephemeral: true,
        });
      };
      const row_left = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("left")
            .setLabel("❰")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("right")
            .setLabel("❱")
            .setStyle(ButtonStyle.Primary)
        );
      const row_middle = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("left")
            .setLabel("❰")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("right")
            .setLabel("❱")
            .setStyle(ButtonStyle.Primary)
        );
      const row_right = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("left")
            .setLabel("❰")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("right")
            .setLabel("❱")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true)
        );
      const dead_buttons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("left")
            .setLabel("❰")
            .setDisabled(true)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("right")
            .setLabel("❱")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true)
        );
      let counter = 0;
      const sent = await interaction.reply({
        embeds: [general, subscription],
        ephemeral: true,
        components: [row_left],
        fetchReply: true,
      });
      const collector = sent.createMessageComponentCollector({
        componentType: ComponentType.Button,
        idle: 90000
      });
      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({
            content: "These buttons aren't for you.",
            ephemeral: true,
          });
        };
        await i.deferUpdate();
        if (counter === 0) {
          await interaction.editReply({
            embeds: [config],
            ephemeral: true,
            components: [row_middle],
          });
          ++counter;
          return;
        } else if (counter === 1) {
          if (i.customId === "left") {
            await interaction.editReply({
              embeds: [general, subscription],
              ephemeral: true,
              components: [row_left],
            });
            --counter;
            return;
          } else if (i.customId === "right") {
            await interaction.editReply({
              embeds: [refresh],
              ephemeral: true,
              components: [row_middle],
            });
            ++counter;
            return;
          };
        } else if (counter === 2) {
          if (i.customId === "left") {
            await interaction.editReply({
              embeds: [config],
              ephemeral: true,
              components: [row_middle],
            });
            --counter;
            return;
          } else if (i.customId === "right") {
            await interaction.editReply({
              embeds: [more],
              ephemeral: true,
              components: [row_right],
            });
            ++counter;
            return;
          };
        } else if (counter === 3) {
          await interaction.editReply({
            embeds: [refresh],
            ephemeral: true,
            components: [row_middle],
          });
          --counter;
          return;
        };
      });
      collector.on("end", async (collected) => {
        await interaction.editReply({
          ephemeral: true,
          components: [dead_buttons],
        }).catch((e) => { });
        return;
      });
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
      client.users.cache.get("727498137232736306").send(`Bobot Sales has trouble in help.js -\n\n${e}`);
    };
  },
};