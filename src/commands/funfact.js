const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const funFactCommand = new SlashCommandBuilder()
  .setName('funfact')
  .setDescription('Get a random fun fact about Void Esports!');

const funFacts = [
  'Void was started as a friend\' group just for fun.',
  'Void is one of the largest self-funded esports organizations.',
  'Void Esports was first created in 2022.',
  'Almost 2 members join Void as you type this command!',
  'Void is arguably the best NA/EU team.',
  'Void Esports has a large audience base throughout the world.',
  'Void Esports isn\'t limited to Fortnite; it has other teams as well, like R6 and COD.',
  'Void is one of the only servers where a mod can become operations without any bias, based purely on hard work.'
];

async function handleFunFact(interaction) {
  const randomFact = funFacts[Math.floor(Math.random() * funFacts.length)];

  const embed = new EmbedBuilder()
    .setTitle('🎲 Void Fun Fact')
    .setDescription(randomFact)
    .setColor(0x8a2be2)
    .setTimestamp()
    .setFooter({ text: 'Did you know?' });

  await interaction.editReply({ embeds: [embed] });
}

module.exports = {
  funFactCommand,
  handleFunFact
};