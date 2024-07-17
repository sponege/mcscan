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
import mc from "minecraft-protocol";
import { PrismaClient, } from "@prisma/client";
import { int2ip, promiseWithTimeout } from "./util.js";
import fetch from "node-fetch";
let webhook = "https://discord.com/api/webhooks/1261722402258157698/e8uyhcfDDU0X9hiwWoMnEGO-NmFsmWXYerEE3p7j9Mmaw3xiULSxpbT_zi_k7IDAvNYN";
const prisma = new PrismaClient();
var embeds = [];
async function scanner(scanner_number, server) {
    // Represents a scanner, you can launch multiple scanners to run asynchronously with each other
    // Promise never resolves! An infinite loop is used to keep the scanner running
    // console.log(`Scanner ${scanner_number} started`);
    // try catch because weird errors occur for some reason
    try {
        // wait a bit before scanning, so we don't mess with other scanners
        // await sleep(1000);
        let address = int2ip(server.ip);
        let response;
        // console.log(`Pinging ${address}`);
        try {
            // ping the server
            response = await promiseWithTimeout(mc.ping({
                host: address,
            }), 5000 // 5 second timeout (for faster scanning)
            );
        }
        catch (e) {
            console.log(`Could not ping ${int2ip(server.ip)}: ${e.message}`);
            // if the server has never been scanned before, delete it
            // this is to avoid scanning honeypots
            if (!server.scanned) {
                /*
                await prisma.server.delete({
                  where: {
                    ip: server.ip,
                  },
                });
                        */
            }
            else {
                // if the server has been scanned before, log it as offline
                await prisma.serverSnapshot.create({
                    data: {
                        ip: server.ip,
                        online: false,
                    },
                });
            }
            return scanner_number;
        }
        let version_name = response.version?.name ?? response.version ?? "Unknown";
        let version_protocol = response.version?.protocol ?? response.protocol ?? -1;
        let player_count = response.players?.online ?? response.playerCount ?? -1;
        let player_max = response.players?.max ?? response.maxPlayers ?? -1;
        let player_list = response.players?.sample ?? response.samplePlayers ?? [];
        let description = "";
        description += response.description?.text ?? "";
        if (response.description?.extra)
            description +=
                " " + response.description.extra.map((e) => e.text).join("");
        description += response.motd ?? "";
        if (description.length == 0)
            description = "No server description";
        // let favicon = response.favicon ?? "";
        try {
            let data = `${version_name}, ${player_count}/${player_max} players online, ${description}, ${address}`;
            embeds.push({
                title: `${player_count}/${player_max} players online`,
                color: 15258703,
                thumbnail: {
                    url: "",
                },
                fields: [
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
                ],
            });
            if (embeds.length == 10) {
                var params = {
                    username: "Patrick Bateman",
                    avatar_url: "https://media.discordapp.net/attachments/1055609152023580672/1261723410762039396/Sigma-grindset-patrick-bateman.png?ex=6693fefe&is=6692ad7e&hm=264676ea8e3cce53dc02320e2fb636c21a475c5739f82aa2e80ff5f5a0c93702&=&format=webp&quality=lossless&width=525&height=350",
                    embeds: embeds,
                };
                fetch(webhook, {
                    method: "POST",
                    headers: {
                        "Content-type": "application/json",
                    },
                    body: JSON.stringify(params),
                });
                embeds = [];
            }
            console.log(data);
            await prisma.serverSnapshot.create({
                data: {
                    ip: server.ip,
                    online: true,
                    version_name: version_name,
                    version_protocol: version_protocol,
                    player_count: player_count,
                    player_max: player_max,
                    description: description,
                    // favicon: favicon,
                },
            });
        }
        catch (e) {
            console.log(`Could not create server snapshot: ${e.message}`);
        }
        try {
            if (!player_list)
                return scanner_number;
            // console.log(
            //   `Players: ${player_list.map((p: any) => p.name).join(", ")}`
            // );
            for (let player of player_list) {
                let uuid = player.id;
                let username = player.name;
                if (typeof uuid != "string" || typeof username != "string")
                    continue;
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
                }
                catch (e) {
                    console.log(`Error while adding player ${player.name} to database: ${e.message}`);
                }
                // console.log(`Added player ${player.name} to database`);
            }
        }
        catch { }
    }
    catch { }
    return scanner_number;
}
var scanners = [];
var stop_scanning = false;
process.on("SIGINT", async function () {
    console.log("Alright, finishing and exiting...");
    stop_scanning = true;
    await Promise.all(scanners);
    console.log("Bye!");
    process.exit();
});
function promiseState(p) {
    const t = {};
    return new Promise((res, rej) => {
        Promise.race([p, t])
            .then((v) => (v === t ? "pending" : "fulfilled"), () => "rejected")
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
    const numScanners = 50; // 5 scanners
    for (let i = 1; i <= numScanners; i++) {
        // scan the server that hasn't been scanned for a while (sort by last_scanned and find oldest)
        // this is to ensure that we are scanning the most outdated servers first
        let server = await prisma.minecraftServer.findFirst({
            where: { scanned: false },
            orderBy: [{ last_scanned: "asc" }],
        });
        if (server == null) {
            console.log("No servers to scan");
            break;
        }
        // mark the server as scanned
        await prisma.minecraftServer.update({
            where: { ip: server.ip },
            data: { scanned: true, last_scanned: new Date() },
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
        if (stop_scanning)
            break;
        let server = await prisma.minecraftServer.findFirst({
            where: { scanned: false },
            orderBy: [{ last_scanned: "asc" }],
        });
        if (server == null) {
            console.log("No servers to scan");
            break;
        }
        // mark the server as scanned
        await prisma.minecraftServer.update({
            where: { ip: server.ip },
            data: { scanned: true, last_scanned: new Date() },
        });
        scanners.push(scanner(finishedScannerNumber, server));
    }
}
main();
