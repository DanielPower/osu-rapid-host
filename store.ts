import create from "zustand/vanilla";
import { readFileSync } from "fs";
import type { Beatmap } from "nodesu";
import type { BanchoLobby } from "bancho.js";
import { subscribeWithSelector } from "zustand/middleware";

type Lobby = {
  lobby: BanchoLobby;
  minStars: number;
  maxStars: number;
};

type Store = {
  beatmaps: Beatmap[];
  lobbies: { [key: string]: Lobby };
};

const store = create<Store>()(
  subscribeWithSelector<Store>(() => ({
    beatmaps: JSON.parse(readFileSync("./beatmaps.json", "utf-8")),
    lobbies: {},
  }))
);

export default store;
