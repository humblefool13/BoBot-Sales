const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "about",
  async interact(client, interaction) {
    try {
      const embed = new EmbedBuilder()
        .setTitle("About BoBot Sales")
        .setColor("#454be9")
        .setDescription("Bobot sales is a bot to post sales and listings of Ethereum , Solana , Polygon , Klaytn NFT collections on Discord . This bot aims at providing cheap , readymade , customisable and easy to setup sales/listings bot . This bot is efficient enough to start posting sales right after your collection has started minting! \nSupports multiple marketplaces !");
      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
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
      client.users.cache.get("727498137232736306").send(`Bobot Sales has trouble in about.js -\n\n${e}`);
    };
  },
}