// Slowly scans IP addresses in a database, like a sloth would to avoid trouble
// Assumes IPs are listening on port 25565
// IPs are read from oldest to newest
// IPs are marked as scanned when they are scanned
// If a server was never scanned and does not respond to a ping, it is deleted from the database (it is probably some sort of honeypot)
// But if a server does not respond to a ping but has been online before, it is logged as offline in the ServerHistory model
// If a server responds to a ping, server information is logged to the ServerHistory model
// Player information is also added to the database, along with their history

process.on("uncaughtException", function (exception) {
  // fuck you mcping and your SHITTY LIBRARY
});

import mc, { Server } from "minecraft-protocol";
import {
  MinecraftServer,
  Player,
  PrismaClient,
  ServerSnapshot,
} from "@prisma/client";
import { int2ip, promiseWithTimeout, sleep } from "./util.js";
import fetch from "node-fetch";

let webhook =
  "https://discord.com/api/webhooks/1261722402258157698/e8uyhcfDDU0X9hiwWoMnEGO-NmFsmWXYerEE3p7j9Mmaw3xiULSxpbT_zi_k7IDAvNYN";
// I know this webhook is publicly on here but I think it would be funny if someone used it so I'm keeping it here :)

const prisma = new PrismaClient();

var embeds: any[] = [];

async function scanner(scanner_number: number, server: MinecraftServer) {
  // Represents a scanner, you can launch multiple scanners to run asynchronously with each other
  // Promise never resolves! An infinite loop is used to keep the scanner running

  // console.log(`Scanner ${scanner_number} started`);

  // try catch because weird errors occur for some reason
  try {
    // wait a bit before scanning, so we don't mess with other scanners
    // await sleep(1000);

    let address = int2ip(server.ip);
    // address = 'a.blamdom.com';
    let response: any;

    console.log(`Pinging ${address}`);

    try {
      // ping the server
      response = await promiseWithTimeout(
        mc.ping({
          host: address,
        }),
        5000 // 5 second timeout (for faster scanning)
      );
    } catch (e: any) {
      console.log(`Could not ping ${int2ip(server.ip)}: ${e.message}`);
      // if the server has never been scanned before, delete it
      // this is to avoid scanning honeypots
      // if (!server.scanned) {
      //   /*
      //   await prisma.server.delete({
      //     where: {
      //       ip: server.ip,
      //     },
      //   });
      // 	*/
      // } else {
      // if the server has been scanned before, log it as offline
      // }
      await prisma.serverSnapshot.create({
        data: {
          ip: server.ip,
          online: false,
        },
      });
      return scanner_number;
    }

    let version_name = response.version?.name ?? response.version ?? "Unknown";
    let version_protocol =
      response.version?.protocol ?? response.protocol ?? -1;
    let player_count = response.players?.online ?? response.playerCount ?? -1;
    let player_max = response.players?.max ?? response.maxPlayers ?? -1;
    let player_list = response.players?.sample ?? response.samplePlayers ?? [];
    let description = "";
    description += response.description?.text ?? "";
    if (response.description?.extra)
      description +=
        " " + response.description.extra.map((e: any) => e.text).join("");
    description += response.motd ?? "";
    if (description.length == 0) description = "No server description";
    let data = `${version_name}, ${player_count}/${player_max} players online, ${description}, ${address}`;
    console.log(data, response);
    // let favicon = response.favicon ?? "";

    let whitelist: string = "u"; // u: unknown, y: yes, n: no
    let disconnect_reason = "";
    let is_modded =
      "modinfo" in response || "forgeData" in response ? "y" : "n";
    let image_url = "";
    if (response.favicon) {
      console.log("hold on im contacting the roblox chicken nugget");

      function dataURItoBlob(dataURI: string) {
        // convert base64/URLEncoded data component to raw binary data held in a string
        var byteString;
        if (dataURI.split(",")[0].indexOf("base64") >= 0)
          byteString = atob(dataURI.split(",")[1]);
        else byteString = unescape(dataURI.split(",")[1]);

        // separate out the mime component
        var mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];

        // write the bytes of the string to a typed array
        var ia = new Uint8Array(byteString.length);
        for (var i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }

        return new Blob([ia], { type: mimeString });
      }

      const formDataWithFile = new FormData();
      formDataWithFile.append(
        "fileToUpload",
        dataURItoBlob(response.favicon),
        "minecraft.png"
      );
      formDataWithFile.append("reqtype", "fileupload");
      let upload = await fetch("https://catbox.moe/user/api.php", {
        // "credentials": "include",
        referrer: "https://catbox.moe/",
        body: formDataWithFile,
        method: "POST",
        // "mode": "cors"
      });
      image_url = await upload.text();
      console.log("thanks gegagedigedagedago you saved my life", image_url);
    }

    if (player_count == 0) {
      let thing = await new Promise((res) => {
        try {
          const client = mc.createClient({
            host: address,
            port: 25565,
            username: "a",
            auth: "microsoft",
          });
          console.log("we are trying to connect");

          client.on("connect", () => {
            console.log("wahoo");
            client.on("packet", (data, packetMeta, buffer, fullBuffer) => {
              // console.log(packetMeta, data);
              if (packetMeta.name == "success") {
                // whoopie new server!!
                whitelist = "n";
                client.end();
                res(whitelist);
              }
              if (packetMeta.name == "disconnect") {
                // dang its whitelist :(
                if (data.reason && "white" in data.reason) whitelist = "u";
                disconnect_reason = data.reason ?? "";
                client.end();
                res(whitelist);
              }
            });
          });
          client.on("error", function (err) {
            console.log("Error occurred");
            console.log(err);
          });

          setTimeout(() => {
            client.end();
            res(whitelist);
          }, 5000); // you have sixty seconds!!

          client.on("disconnect", () => {
            res(whitelist);
          });
        } catch (err) {
          res({ type: "error", error: err });
          console.log("L whitelist check", err);
        }
      });
    }

    try {
      let fields = [
        {
          name: "Version",
          value: version_name,
          inline: true,
        },
        {
          name: "Description",
          value: description,
          inline: true,
        },
        {
          name: "Server IP",
          value: address,
          inline: true,
        },
        {
          name: "Whitelist",
          value: whitelist == "y" ? "Yes" : whitelist == "n" ? "No" : "Unknown",
          inline: true,
        },
        {
          name: "Modded",
          value: is_modded == "y" ? "Yes" : "No (hopefully)",
          inline: true,
        },
      ];
      if (disconnect_reason)
        fields.push({
          name: "Disconnect Reason",
          value: disconnect_reason,
          inline: true,
        });
      embeds.push({
        title: `${player_count}/${player_max} players online`,
        color:
          whitelist == "y" ? 0xee5f5f : player_count > 0 ? 15258703 : 8121461,
        thumbnail: {
          url: image_url,
        },
        fields: fields,
      });

      if (embeds.length == 10) {
        console.log("we are trying to be sigma here");
        var params = {
          username: "Patrick Bateman",
          avatar_url:
            "https://media.discordapp.net/attachments/1055609152023580672/1261723410762039396/Sigma-grindset-patrick-bateman.png?ex=6693fefe&is=6692ad7e&hm=264676ea8e3cce53dc02320e2fb636c21a475c5739f82aa2e80ff5f5a0c93702&=&format=webp&quality=lossless&width=525&height=350",
          embeds: embeds,
        };

        embeds = [];

        await fetch(webhook, {
          method: "POST",
          headers: {
            "Content-type": "application/json",
          },
          body: JSON.stringify(params),
        });
      }

      await prisma.serverSnapshot.create({
        data: {
          ip: server.ip,
          online: true,
          version_name,
          version_protocol,
          player_count,
          player_max,
          description,
          whitelist,
          is_modded,
          favicon:
            image_url.slice(image_url.length - 3) == "png"
              ? image_url.slice(image_url.length - 10, image_url.length - 4)
              : "",
          // favicon: favicon,
        },
      });
    } catch (e: any) {
      console.log(`Could not create server snapshot: ${e.message}`);
    }

    try {
      if (!player_list) return scanner_number;

      // console.log(
      //   `Players: ${player_list.map((p: any) => p.name).join(", ")}`
      // );

      for (let player of player_list) {
        let uuid = player.id;
        let username = player.name;
        if (typeof uuid != "string" || typeof username != "string") continue;
        let player_row = await prisma.player.upsert({
          where: {
            uuid: uuid,
          },
          create: {
            uuid: uuid,
            username: username,
          },
          update: {
            username: username,
          },
        });

        try {
          await prisma.playerHistory.create({
            data: {
              player_id: player_row.id,
              ip: server.ip,
            },
          });
        } catch (e: any) {
          console.log(
            `Error while adding player ${player.name} to database: ${e.message}`
          );
        }
        // console.log(`Added player ${player.name} to database`);
      }
    } catch {}
  } catch (err) {
    console.log("ohh fuck you cant debug this can you", err);
  }

  return scanner_number;
}

var scanners: Promise<number>[] = [];
var stop_scanning = false;

process.on("SIGINT", async function () {
  console.log("Alright, finishing and exiting...");
  stop_scanning = true;
  await Promise.all(scanners);
  var params = {
    username: "Patrick Bateman",
    avatar_url:
      "https://media.discordapp.net/attachments/1055609152023580672/1261723410762039396/Sigma-grindset-patrick-bateman.png?ex=6693fefe&is=6692ad7e&hm=264676ea8e3cce53dc02320e2fb636c21a475c5739f82aa2e80ff5f5a0c93702&=&format=webp&quality=lossless&width=525&height=350",
    embeds: embeds,
  };
  await fetch(webhook, {
    method: "POST",
    headers: {
      "Content-type": "application/json",
    },
    body: JSON.stringify(params),
  });
  console.log("Bye!");
  process.exit();
});

function promiseState(p: Promise<number>) {
  const t = {};
  return new Promise((res, rej) => {
    Promise.race([p, t])
      .then(
        (v) => (v === t ? "pending" : "fulfilled"),
        () => "rejected"
      )
      .then(res);
  });
}

async function main() {
  // launch 10 scanners
  /*
  for (let i = 1; i <= 10; i++) {
    scanner(i);
    await sleep(4000); // stagger the scanners so they don't all start at the same time
  }
	*/

  const numScanners = 1; // 5 scanners

  for (let i = 1; i <= numScanners; i++) {
    // scan the server that hasn't been scanned for a while (sort by last_scanned and find oldest)
    // this is to ensure that we are scanning the most outdated servers first

    let server = await prisma.minecraftServer.findFirst({
      orderBy: [{ last_scanned: "asc" }],
    });

    if (server == null) {
      console.log("No servers to scan");
      break;
    }

    // put the server in the back of the queue
    await prisma.minecraftServer.update({
      where: { ip: server.ip },
      data: { last_scanned: new Date() },
    });

    scanners.push(scanner(i, server));
  }

  while (true) {
    let finishedScannerNumber = await Promise.any(scanners);

    for (let i = 0; i < scanners.length; i++) {
      // remove finished scanner
      if ((await promiseState(scanners[i])) != "pending") {
        scanners.splice(i, 1);
        break;
      }
    }

    if (stop_scanning) break;

    let server = await prisma.minecraftServer.findFirst({
      orderBy: [{ last_scanned: "asc" }],
    });

    if (server == null) {
      console.log("No servers to scan");
      break;
    }

    // put the server in the back of the queue
    await prisma.minecraftServer.update({
      where: { ip: server.ip },
      data: { last_scanned: new Date() },
    });

    scanners.push(scanner(finishedScannerNumber, server));
  }
}

main();
