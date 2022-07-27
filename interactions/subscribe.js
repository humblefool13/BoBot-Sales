const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "subscribe",
  async interact(client, interaction) {
    const embed = new EmbedBuilder()
      .setDescription("Join our [Discord Support Server](https://discord.gg/HweZtrzAnX 'Click to join the support server !') and make a ticket to redeem/purchase a subscription !!!")
      .setColor("#454be9");
    interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }
}