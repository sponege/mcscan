// Imports IPs from a file into the database
// Assumes IPs are listening on port 25565 but have not yet been scanned
// IPs are read from stdin, one per line

import { ip2int } from "./util";
import fs from "fs";

function readLines(): string[] {
  return fs.readFileSync(0).toString().split("\n");
}

async function main() {
  let lines = readLines();

  let ips = lines.map((line) => {
    if (line.length == 0) return null;

    let ip = line.split(" ")[3]; // ex: open tcp 25565 45.43.233.225 1671854414
    return ip;
  });

  for (let ip of ips) {
    if (typeof ip != "string") continue;
    console.log(ip);
  }
}

main();
