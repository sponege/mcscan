import { int2ip } from "./util.js";
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();

  let ips = (
    await prisma.serverSnapshot.findMany({
      select: { ip: true },
      distinct: ["ip"],
    })
  ).map((row) => int2ip(row.ip));

  console.log(ips.join("\n"));
}

main();
