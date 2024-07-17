// Imports IPs from a file into the database
// Assumes IPs are listening on port 25565 but have not yet been scanned
// IPs are read from stdin, one per line

import { ip2int } from "./util";
import fs from "fs";

function readLines(): string[] {
  return fs.readFileSync(0).toString().split("\n");
}

function readFile(filename: string): string[] {
  return fs.readFileSync(filename).toString().split("\n");
}

async function main() {
  let ips = readFile("ips.txt");
  let honeypots = readFile("honeypot-list.txt");

  for (let ip of ips) {
    if (!honeypots.includes(ip)) console.log(ip);
  }
}

main();
