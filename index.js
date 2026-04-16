const {
  Client, GatewayIntentBits,
  EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle,
  REST, Routes, SlashCommandBuilder
} = require("discord.js");

const fs = require("fs");
const config = require("./config.json");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== BANCO =====
function loadDB() {
  return JSON.parse(fs.readFileSync("./database.json"));
}

function saveDB(data) {
  fs.writeFileSync("./database.json", JSON.stringify(data, null, 2));
}

// ===== COMANDO /painel =====
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel da loja")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(config.token);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commands }
  );
})();

// ===== BOT ONLINE =====
client.once("ready", () => {
  console.log("🔥 Bot loja online!");
});

// ===== INTERAÇÕES =====
client.on("interactionCreate", async (interaction) => {

  // COMANDO
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "painel") {

      const embed = new EmbedBuilder()
        .setTitle("PowerCheat | Catálogo de Produtos")
        .setDescription("🎲 | Painel:")
        .setColor("#5865F2");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("add_produto")
          .setLabel("Adicionar Produto")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("ver_catalogo")
          .setLabel("Catálogo")
          .setStyle(ButtonStyle.Success)
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    }
  }

  // BOTÕES
  if (interaction.isButton()) {

    let db = loadDB();

    // ADD PRODUTO
    if (interaction.customId === "add_produto") {

      const id = Date.now().toString();

      db.produtos[id] = {
        nome: "Produto",
        descricao: "Não informado",
        preco: 0,
        estoque: [],
        tipoEntrega: "dm"
      };

      saveDB(db);

      await interaction.reply({
        content: `✅ Produto criado!\nID: ${id}`,
        ephemeral: true
      });
    }

    // VER CATÁLOGO
    if (interaction.customId === "ver_catalogo") {

      if (Object.keys(db.produtos).length === 0) {
        return interaction.reply({
          content: "Sem produtos.",
          ephemeral: true
        });
      }

      for (let id in db.produtos) {

        const p = db.produtos[id];

        const embed = new EmbedBuilder()
          .setTitle(p.nome)
          .setDescription(p.descricao)
          .addFields(
            { name: "💰 Preço", value: `R$ ${p.preco}`, inline: true },
            { name: "📦 Estoque", value: `${p.estoque.length}`, inline: true }
          )
          .setColor("Green");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`comprar_${id}`)
            .setLabel("Comprar")
            .setStyle(ButtonStyle.Success)
        );

        await interaction.user.send({ embeds: [embed], components: [row] });
      }

      await interaction.reply({
        content: "📩 Catálogo enviado na sua DM!",
        ephemeral: true
      });
    }

    // COMPRAR
    if (interaction.customId.startsWith("comprar_")) {

      const id = interaction.customId.split("_")[1];
      const produto = db.produtos[id];

      if (!produto || produto.estoque.length === 0) {
        return interaction.reply({
          content: "❌ Sem estoque!",
          ephemeral: true
        });
      }

      const item = produto.estoque.shift();

      db.historico.push({
        user: interaction.user.id,
        produto: produto.nome,
        item: item,
        data: new Date()
      });

      saveDB(db);

      try {
        await interaction.user.send(
          `🛒 Compra realizada!\n\n📦 ${produto.nome}\n🔑 ${item}`
        );

        await interaction.reply({
          content: "✅ Produto entregue na DM!",
          ephemeral: true
        });

      } catch {
        await interaction.reply({
          content: "❌ Ative sua DM!",
          ephemeral: true
        });
      }
    }

  }

});

client.login(config.token);