// Require the necessary discord.js classes
import { PrismaClient } from "@prisma/client";
import { int2ip, promiseWithTimeout, sleep } from "../dist/util.js";
import fs from "node:fs";
import path from "node:path";
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
} from "discord.js";
import dotenv from "dotenv";
dotenv.config();

process.on("uncaughtException", console.log);

const prisma = new PrismaClient();

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let commands = [
  {
    data: {
      name: "search",
      description: "Searches for Minecraft servers.",
      integration_types: [1],
      contexts: [0, 1, 2],
      options: [
        {
          name: "query",
          description: "Search for something here!",
          type: 3, // string
        },
        {
          name: "whitelist",
          description:
            "Do you want to search for non-whitelisted servers? (Put in false if so)",
          type: 5, // boolean
        },
        {
          name: "protocol",
          description: "Provide a protocol range (ex: 2-757)",
          type: 3, // string
        },
      ],
    },
    async execute(interaction) {
      let search = {};
      for (let field of interaction.options._hoistedOptions)
        search[field.name] = field.value;
      console.log(search);
      let where = {};
      if (search.query) where.description = { search: search.query };
      if ("whitelist" in search) where.whitelist = search.whitelist ? "y" : "n";
      if ("protocol" in search) {
        if (search.protocol.includes("-")) {
          let [start, end] = search.protocol.split("-").map((n) => Number(n));
          where.version_protocol = { gt: start - 1, lt: end + 1 };
        } else {
          let protocol = Number(search.protocol);
          where.version_protocol = protocol;
        }
      }
      let servers = await prisma.serverSnapshot.findMany({
        where,
        take: 10,
      });

      console.log(servers);
      let embeds = server_embeds(servers);
      if (embeds.length)
        await interaction.reply({
          embeds,
        });
      else
        await interaction.reply({
          embeds: [
            {
              title: `No servers found from that query :(`,
              description: "Try widening your search a little!",
              color: 0xee5f5f,
            },
          ],
        });
    },
  },
  {
    data: {
      name: "player",
      description: "Searches for Minecraft players.",
      integration_types: [1],
      contexts: [0, 1, 2],
      options: [
        {
          name: "username",
          description: "Search for something here!",
          type: 3, // string
          required: true,
        },
      ],
    },
    async execute(interaction) {
      let search = {};
      for (let field of interaction.options._hoistedOptions)
        search[field.name] = field.value;
      console.log(search);
      let players = await prisma.player.findMany({
        where: { username: { search: search.username } },
        take: 10,
      });

      console.log(players);
      let embeds = player_embeds(players);
      if (embeds.length)
        await interaction.reply({
          embeds,
        });
      else
        await interaction.reply({
          embeds: [
            {
              title: `No users found from that query :(`,
              description: "Try widening your search a little!",
              color: 0xee5f5f,
            },
          ],
        });
    },
  },
  {
    data: {
      name: "history",
      description: "Given a player ID, shows the player's server history.",
      integration_types: [1],
      contexts: [0, 1, 2],
      options: [
        {
          name: "id",
          description: "The ID of the user (not UUID!)",
          type: 4, // integer
          required: true,
        },
      ],
    },
    async execute(interaction) {
      let search = {};
      for (let field of interaction.options._hoistedOptions)
        search[field.name] = field.value;
      console.log(search);
      let history = await prisma.playerHistory.findMany({
        where: { player_id: search.id },
        take: 10,
      });

      let servers = [];

      for (let server of history) {
        console.log(server);
        servers = servers.concat(
          await prisma.serverSnapshot.findMany({
            where: { ip: server.ip },
            take: 10,
          })
        );
      }

      console.log(servers);
      let embeds = server_embeds(servers);
	  embeds = embeds.slice(0, 10);
      if (embeds.length)
        await interaction.reply({
          embeds,
        });
      else
        await interaction.reply({
          embeds: [
            {
              title: `No users found from that query :(`,
              description: "Try widening your search a little!",
              color: 0xee5f5f,
            },
          ],
        });
    },
  },
];

client.commands = new Collection();

for (let command of commands) {
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] /${command.data.name} is missing a required "data" or "execute" property.`
    );
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
});
// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (client) => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
});

const body = [];

for (let command of commands) body.push(command.data);

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.token);

// and deploy your commands!
(async () => {
  try {
    console.log(`Started refreshing ${body.length} application (/) commands.`);

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationCommands(process.env.client_id),
      { body }
    );

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();

function server_embeds(servers) {
  let embeds = [];

  for (let server of servers) {
    let fields = [
      {
        name: "Version",
        value:
          `${server.version_name}` +
          (server.version_protocol > 0 ? ` (${server.version_protocol})` : ""),
        inline: true,
      },
      {
        name: "Description",
        value: server.description,
        inline: true,
      },
      {
        name: "Server IP",
        value: int2ip(server.ip),
        inline: true,
      },
      {
        name: "Whitelist",
        value:
          server.whitelist == "y"
            ? "Yes"
            : server.whitelist == "n"
            ? "No"
            : "Unknown",
        inline: true,
      },
      {
        name: "Modded",
        value:
          server.is_modded == "y"
            ? "Yes"
            : server.is_modded == "n"
            ? "No (hopefully)"
            : "Unknown",
        inline: true,
      },
    ];
    let embed = {
      title: `${server.player_count}/${server.player_max} players online`,
      color:
        server.whitelist == "y"
          ? 0xee5f5f
          : server.whitelist == "u"
          ? 15258703
          : 8121461,

      fields: fields,
    };
    if (server.favicon)
      embed.thumbnail = {
        url: `https://files.catbox.moe/${server.favicon}.png`,
      };
    embeds.push(embed);
  }

  return embeds;
}

function player_embeds(players) {
  let embeds = [];

  for (let player of players) {
    let embed = {
      title: player.username,
      fields: [
        { name: "User ID", value: player.id, inline: true },
        { name: "UUID", value: player.uuid, inline: true },
      ],
    };
    embeds.push(embed);
  }

  return embeds;
}

function history_embeds(history) {
  let embeds = [];

  for (let server of history) {
    console.log(history);
    let embed = {
      title: int2ip(server.ip),
    };
    embeds.push(embed);
  }

  return embeds;
}

// Log in to Discord with your client's token
client.login(process.env.token);
