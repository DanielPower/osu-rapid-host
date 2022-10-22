import { db, api } from "./global.js";
import { readFileSync, writeFileSync } from "fs";

let beatmapSetId: number = JSON.parse(
  readFileSync("./scrape_state.json", "utf-8")
);

while (beatmapSetId < 242575) {
  console.log(`Collecting beatmapset ${beatmapSetId}`);
  let beatmaps;
  try {
    beatmaps = (await api.beatmaps.getBySetId(beatmapSetId)) as {
      [key: string]: object;
    }[];
  } catch {
    continue;
  }

  for (const beatmap of beatmaps) {
    await db.create("beatmap", beatmap);
  }

  beatmapSetId += 1;
  writeFileSync("./scrape_state.json", JSON.stringify(beatmapSetId));
}

