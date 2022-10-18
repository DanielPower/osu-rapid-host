import { BanchoClient } from "bancho.js";
import { readFileSync } from "fs";
import * as Nodesu from "nodesu";

const credentials = JSON.parse(readFileSync("./auth.json", "utf-8"));

export const api = new Nodesu.Client(credentials.apiV1Key, { parseData: true });
export const client = new BanchoClient({
  username: credentials.username,
  password: credentials.password,
  apiKey: credentials.apiV1Key,
});
