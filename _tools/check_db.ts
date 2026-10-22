import mongoose from "mongoose";
import { User } from "../server/src/models/User.js";

import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const MONGODB_URI =
  "mongodb+srv://levshauz_db_user:1PqMRkTpEr3Lr5NV@cluster0.chvnrb9.mongodb.net/?appName=Cluster0";

async function main() {
  await mongoose.connect(MONGODB_URI, {
    dbName: "liner",
    family: 4,
  });

  console.log("Connected to DB");

  const users = await User.find({}).lean();
  console.log(`Found ${users.length} users:`);
  for (const u of users) {
    console.log({
      name: u.name,
      createdAt: u.createdAt,
      isRegistered: u.isRegistered,
      telegramId: u.telegramId,
    });
  }

  await mongoose.disconnect();
}

main().catch(console.error);
