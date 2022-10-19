import create from "zustand/vanilla";
import { readFileSync } from "fs";
import type { Beatmap } from "nodesu";
import type { BanchoLobbyPlayer } from "bancho.js";
import { subscribeWithSelector } from "zustand/middleware";
import produce from "immer";
import { WinCondition } from "./types";

type Lobby = {
  minStars: number;
  maxStars: number;
  skipRequests: number;
  slots: BanchoLobbyPlayer[];
  winCondition: WinCondition;
};

type Store = {
  beatmaps: Beatmap[];
  lobbies: { [key: string]: Lobby };
  createLobby: (uuid: string, lobby: Lobby) => void;
  updateLobbyWinCondition: (uuid: string, winCondition: WinCondition) => void;
  updateLobbyStarRating: (uuid: string, minStars: number, maxStars: number) => void;
};

const store = create<Store>()(
  subscribeWithSelector<Store>((set) => ({
    beatmaps: JSON.parse(readFileSync("./beatmaps.json", "utf-8")),
    lobbies: {},
    createLobby: (uuid, properties) =>
      set(
        produce((draft) => {
          draft.lobbies[uuid] = properties;
        })
      ),
    updateLobbyWinCondition: (uuid, winCondition) =>
      set(
        produce((draft) => {
          draft.lobbies[uuid].winCondition = winCondition;
        })
      ),
    updateLobbyStarRating: (uuid, minStars, maxStars) => set(
        produce((draft) => {
          draft.lobbies[uuid].minStars = minStars;
          draft.lobbies[uuid].maxStars = maxStars;
        })
    )
  }))
);

export default store;
