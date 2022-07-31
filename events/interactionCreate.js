const { Collection } = require("discord.js");
const cooldowns = new Collection();

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    let Icommand = "";
    try {
      if (interaction.isChatInputCommand()) {
        Icommand = interaction.commandName;
      } else {
        return;
      };
      const command = client.interactions.get(Icommand);
      if (!cooldowns.has(command.name)) {
        cooldowns.set(command.name, new Collection());
      };
      if (interaction.user.id !== '727498137232736306') {
        const now = Date.now();
        const timestamps = cooldowns.get(command.name);
        const cooldownAmount = 120 * 1000;
        if (timestamps.has(interaction.user.id)) {
          const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
          if (now < expirationTime) {
            const timeLeft = parseInt(expirationTime / 1000);
            return interaction.reply({
              content: `Please wait till - <t:${timeLeft}:R> before reusing the \`${command.name}\` command.`,
              ephemeral: true,
            });
          };
        };
        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
      };
      command.interact(client, interaction);
    } catch (e) {
      console.log(e);
      interaction.reply({
        content: "I am having some trouble , the dev has been informed about it. Please try again in some hours.",
        ephemeral: true,
      }).then(() => {
        client.users.cache.get("727498137232736306").send(`Bobot has trouble interactionCreate.js -\n\n${e}`);
      });
    };
  }, //execute
};