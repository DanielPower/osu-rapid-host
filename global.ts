import banchojs from "bancho.js";
import { readFileSync } from "fs";
import * as Nodesu from "nodesu";
import Surreal from "surrealdb.js";

const secrets = JSON.parse(readFileSync("./secrets.json", "utf-8"));

export const lobbies: { [key: string]: banchojs.BanchoLobby } = {};

export const api = new Nodesu.Client(secrets.apiV1Key);

export const client = new banchojs.BanchoClient({
  username: secrets.username,
  password: secrets.ircPassword,
  apiKey: secrets.apiV1Key,
});

export const db = new Surreal("http://127.0.0.1:8000/rpc");
await db.signin({
  user: "root",
  pass: "root",
});
await db.use("main", "osu-rapid-host");
