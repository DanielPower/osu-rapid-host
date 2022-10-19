import type { BanchoLobby, BanchoMessage } from "bancho.js";
import store from "./store";
import shallow from "zustand/shallow";
import { api, lobbies } from "./global";
import type { Beatmap } from "nodesu";
import { WinCondition } from "./types";
import { writeFileSync } from "fs";
import { randomUUID } from "crypto";
import { difficultyMessage, echoMessage } from "./message_handlers";
import { Mode } from "nodesu";

export const splitWhitespace = (str: string) => str.split(/\s+/);

export const parseBeatmapMessage = (message: string): number | null => {
  const result = message.match(/\[.+\/(\d+) /);
  if (result && result.length === 2) {
    return parseInt(result[1], 10);
  }
  return null;
};

export const addBeatmap = async (beatmapId: number): Promise<boolean> => {
  const { beatmaps } = store.getState();
  const beatmapSetIds = new Set(
    beatmaps.map((beatmap) => beatmap.beatmapSetId)
  );
  const [beatmap] = (await api.beatmaps.getByBeatmapId(beatmapId)) as Beatmap[];
  if (!beatmapSetIds.has(beatmap.beatmapSetId)) {
    beatmapSetIds.add(beatmap.beatmapSetId);
    const beatmapSet = (await api.beatmaps.getBySetId(
      beatmap[0].beatmapSetId
    )) as Beatmap[];
    store.setState((state) => ({
      ...state,
      beatmaps: [...beatmaps, ...beatmapSet],
    }));
    writeFileSync("beatmaps.json", JSON.stringify(beatmaps), "utf-8");
    return true;
  }
  return false;
};

export const asyncTimer = (value: number) =>
  new Promise((resolve) => setTimeout(resolve, value));

export const setRandomBeatmap = async (uuid: string) => {
  const lobby = lobbies[uuid];
  const { beatmaps } = store.getState();
  const { minStars, maxStars } = store.getState().lobbies[uuid];
  const lobbyBeatmaps = beatmaps.filter(
    (beatmap) =>
      beatmap.difficultyRating > minStars && beatmap.difficultyRating < maxStars
  );
  const beatmap =
    lobbyBeatmaps[Math.floor(Math.random() * lobbyBeatmaps.length)];
  await lobby.channel.sendMessage(
    `Now playing [https://osu.ppy.sh/beatmapsets/${beatmap.setId}#${
      beatmap.mode
    }/${beatmap.id} ${beatmap.title}] ${beatmap.difficultyRating.toFixed(2)}*`
  );
  await lobby.setMap(beatmap.id, Mode.osu);
};

export const queueMap = async (uuid: string) => {
  const lobby = lobbies[uuid];
  await setRandomBeatmap(uuid);
  await lobby.channel.sendMessage("Map will start in 90 seconds");
  await asyncTimer(60000);
  await lobby.channel.sendMessage("Map will start in 30 seconds");
  await asyncTimer(20000);
  await lobby.channel.sendMessage("Map will start in 10 seconds");
  await asyncTimer(10000);
  await lobby.startMatch();
};

export const manageLobby = async (lobby: BanchoLobby): Promise<() => void> => {
  await lobby.updateSettings();
  const uuid = randomUUID();
  lobbies[uuid] = lobby;
  store.getState().createLobby(uuid, {
    slots: [],
    winCondition: lobby.winCondition,
    minStars: 3,
    maxStars: 5,
    skipRequests: 0,
  });

  const matchFinished = () => queueMap(uuid);
  const matchAborted = () => queueMap(uuid);
  const allPlayersReady = () => lobby.startMatch();
  const channelMessage = (message: BanchoMessage) => {
    for (const messageHandler of [difficultyMessage(uuid), echoMessage]) {
      const [isHandled, value] = messageHandler.trigger(message);
      if (isHandled) {
        (messageHandler as any).effect(message, value);
        break;
      }
    }
  };
  const winCondition = (winCondition: WinCondition) => {
    store.getState().updateLobbyWinCondition(uuid, winCondition);
  };

  lobby.on("matchFinished", matchFinished);
  lobby.on("matchAborted", () => matchAborted);
  lobby.on("allPlayersReady", allPlayersReady);
  lobby.on("winCondition", winCondition);
  lobby.channel.on("message", channelMessage);

  const unsubscribeTitle = store.subscribe(
    (state) => ({
      minStars: state.lobbies[uuid].minStars,
      maxStars: state.lobbies[uuid].maxStars,
      winCondition: state.lobbies[uuid].winCondition,
    }),
    ({ minStars, maxStars, winCondition }) => {
      const winConditionLabel = {
        [WinCondition.ScoreV1]: "SV1",
        [WinCondition.ScoreV2]: "SV2",
        [WinCondition.Combo]: "Combo",
        [WinCondition.Accuracy]: "Acc",
      }[winCondition];
      lobby.channel.sendMessage(
        `!mp name (BETA) Rapid Host | ${minStars}-${maxStars}* | ${winConditionLabel} | FM`
      );
    },
    { equalityFn: shallow, fireImmediately: true }
  );

  const unsubscribeStars = store.subscribe(
    (state) => [state.lobbies[uuid].minStars, state.lobbies[uuid].maxStars],
    ([minStars, maxStars]) => {
      const beatmap = store
        .getState()
        .beatmaps.find((beatmap) => beatmap.id === lobby.beatmapId);
      if (
        minStars > beatmap.difficultyRating ||
        maxStars < beatmap.difficultyRating
      ) {
        setRandomBeatmap(uuid);
      }
    }
  );

  await lobby.clearHost();
  await queueMap(uuid);

  return () => {};
  // return () => {
  //   lobby.off("matchFinished", matchFinished);
  //   lobby.off("matchAborted", () => matchAborted);
  //   lobby.off("allPlayersReady", allPlayersReady);
  //   lobby.channel.off("message", channelMessage);
  //   unsubscribeTitle();
  //   unsubscribeStars();
  // };
};
