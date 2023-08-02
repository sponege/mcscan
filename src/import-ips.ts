// Imports IPs from a file into the database
// Assumes IPs are listening on port 25565 but have not yet been scanned
// IPs are read from stdin, one per line

import { ip2int } from "./util";
import { PrismaClient } from "@prisma/client";
import fs from "fs";

function readLines(): string[] {
  return fs.readFileSync(0).toString().split("\n");
}

async function main() {
  let lines = readLines();

  console.log(lines.length + " lines read");

  let ips = lines.map((line) => {
    if (line.length == 0) return null;

    let ip = ip2int(line.split(" ")[3]); // ex: open tcp 25565 45.43.233.225 1671854414
    return ip;
  });

  console.log(ips);
  console.log(ips.length + " IPs to import");

  const prisma = new PrismaClient();

  let massInsert = [];

  for (let ip of ips) {
    if (typeof ip != "number") continue;
    massInsert.push({ ip: ip });
  }

  console.log(massInsert.length + " IPs to insert");

  prisma.server
    .createMany({
      data: massInsert,
      skipDuplicates: true,
    })
    .then(() => {
      console.log("Done");
    });

  /*
  for (let ip of ips) {
    if (typeof ip != "number") continue;
    try {
      await prisma.server.create({
        data: { ip: ip },
      });
      console.log("Imported " + int2ip(ip));
    } catch (e) {
      console.log(`Could not import ${int2ip(ip)}: ${e}`);
    }
  }
	*/
}

main();
