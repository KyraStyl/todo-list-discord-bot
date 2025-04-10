const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, Events } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const todos = new Map(); // channelId => { title: string, tasks: [{text, completed}] }

const getEmbed = (list) => new EmbedBuilder()
  .setTitle(`📋 ${list.title || 'Todo List'}`)
  .setDescription(
    list.tasks.length
      ? list.tasks.map((t, i) => `${i + 1}. ${t.completed ? '✅' : '☐'} ${t.text}`).join('\n')
      : 'No tasks yet!'
  )
  .setColor('#5865F2');

const getActionRows = (tasks) => {
  const rows = [];

  for (let i = 0; i < tasks.length && i < 25; i++) {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`toggle_${i}`)
          .setLabel(`${tasks[i].completed ? '✅' : '☐'} ${tasks[i].text}`)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`edit_${i}`)
          .setLabel('✏️ Edit')
          .setStyle(ButtonStyle.Primary)
      );
    rows.push(row);
  }

  // Final row with global actions
  const finalRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder().setCustomId('add_task').setLabel('➕ Add Task').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('edit_title').setLabel('📝 Edit List Name').setStyle(ButtonStyle.Secondary),
    );
  rows.push(finalRow);

  return rows;
};

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.content === '!todo') {
    const channelId = message.channel.id;
    if (!todos.has(channelId)) {
      todos.set(channelId, { title: 'Todo List', tasks: [] });
    }
    const list = todos.get(channelId);
    await message.channel.send({
      embeds: [getEmbed(list)],
      components: getActionRows(list.tasks)
    });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton() && !interaction.isModalSubmit()) return;
  const channelId = interaction.channelId;
  if (!todos.has(channelId)) todos.set(channelId, { title: 'Todo List', tasks: [] });
  const list = todos.get(channelId);

  if (interaction.isButton()) {
    const id = interaction.customId;

    if (id === 'add_task') {
      const modal = new ModalBuilder()
        .setCustomId('modal_add')
        .setTitle('Add New Task')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('task_input')
              .setLabel('Task')
              .setStyle(TextInputStyle.Short)
          )
        );
      return interaction.showModal(modal);
    }

    if (id === 'edit_title') {
      const modal = new ModalBuilder()
        .setCustomId('modal_title')
        .setTitle('Rename Todo List')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('title_input')
              .setLabel('New Title')
              .setStyle(TextInputStyle.Short)
              .setValue(list.title || 'Todo List')
          )
        );
      return interaction.showModal(modal);
    }

    if (id.startsWith('toggle_')) {
      const index = parseInt(id.split('_')[1]);
      if (list.tasks[index]) list.tasks[index].completed = !list.tasks[index].completed;
    } else if (id.startsWith('edit_')) {
      const index = parseInt(id.split('_')[1]);
      const modal = new ModalBuilder()
        .setCustomId(`modal_edit_${index}`)
        .setTitle(`Edit Task ${index + 1}`)
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('edit_input')
              .setLabel('Edit Task Text')
              .setStyle(TextInputStyle.Short)
              .setValue(list.tasks[index]?.text || '')
          )
        );
      return interaction.showModal(modal);
    }

    await interaction.update({ embeds: [getEmbed(list)], components: getActionRows(list.tasks) });
  }

  if (interaction.isModalSubmit()) {
    const id = interaction.customId;

    if (id === 'modal_add') {
      const taskText = interaction.fields.getTextInputValue('task_input');
      list.tasks.push({ text: taskText, completed: false });
    } else if (id === 'modal_title') {
      const newTitle = interaction.fields.getTextInputValue('title_input');
      list.title = newTitle;
    } else if (id.startsWith('modal_edit_')) {
      const index = parseInt(id.split('_')[2]);
      const newText = interaction.fields.getTextInputValue('edit_input');
      if (list.tasks[index]) list.tasks[index].text = newText;
    }

    await interaction.update({ embeds: [getEmbed(list)], components: getActionRows(list.tasks) });
  }
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_BOT_TOKEN);
