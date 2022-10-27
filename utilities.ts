import type { BanchoLobby, BanchoMessage } from "bancho.js";
import store from "./store.js";
import shallow from "zustand/shallow";
import { db, lobbies } from "./global.js";
import { WinCondition } from "./types.js";
import { randomUUID } from "crypto";
import { difficultyMessage, echoMessage } from "./message_handlers.js";
import {ApprovalStatus, Mode} from "nodesu";

export const splitWhitespace = (str: string) => str.split(/\s+/);

export const asyncTimer = (value: number) =>
  new Promise((resolve) => setTimeout(resolve, value));

export const parseDate = (osuDate) => new Date(osuDate).toISOString();

export const parseBeatmap = (beatmap) => ({
  ...beatmap,
  approved: parseInt(beatmap.approved),
  approved_date: parseDate(beatmap.approved_date),
  audio_unavailable: !!beatmap.audio_unavailable,
  beatmap_id: parseInt(beatmap.beatmap_id),
  beatmapset_id: parseInt(beatmap.beatmapset_id),
  bpm: parseInt(beatmap.bpm),
  count_normal: parseInt(beatmap.count_normal),
  count_slider: parseInt(beatmap.count_slider),
  count_spinner: parseInt(beatmap.count_spinner),
  creator_id: parseInt(beatmap.creator_id),
  diff_aim: parseFloat(beatmap.diff_aim),
  diff_approach: parseFloat(beatmap.diff_approach),
  diff_drain: parseFloat(beatmap.diff_drain),
  diff_overall: parseFloat(beatmap.diff_overall),
  diff_size: parseFloat(beatmap.diff_size),
  diff_speed: parseFloat(beatmap.diff_speed),
  difficultyrating: parseFloat(beatmap.difficultyrating),
  download_unavailable: !!beatmap.download_unavailable,
  favourite_count: parseInt(beatmap.favourite_count),
  genre_id: parseInt(beatmap.genre_id),
  hit_length: parseInt(beatmap.hit_length),
  language_id: parseInt(beatmap.language_id),
  last_update: parseDate(beatmap.last_update),
  max_combo: parseInt(beatmap.max_combo),
  mode: parseInt(beatmap.mode),
  passcount: parseInt(beatmap.passcount),
  playcount: parseInt(beatmap.playcount),
  rating: parseFloat(beatmap.rating),
  storyboard: !!beatmap.storyboard,
  submit_date: parseDate(beatmap.submit_date),
  total_length: parseInt(beatmap.total_length),
  video: !!beatmap.video,
});

export const setRandomBeatmap = async (uuid: string) => {
  const lobby = lobbies[uuid];
  const { minStars, maxStars, mode } = store.getState().lobbies[uuid];
  const [
    {
      result: [beatmap],
    },
  ] = (await db.query(
    `
    SELECT beatmap_id, title, difficultyrating, beatmapset_id, mode
    FROM beatmap 
    WHERE 
      difficultyrating > $minStars 
      && difficultrating < $maxStars 
      && mode = $mode
      && approved INSIDE $status
    ORDER BY rand()
    LIMIT 1`,
    {
      minStars,
      maxStars,
      mode,
      status: [ApprovalStatus.ranked, ApprovalStatus.loved],
    }
  )) as any;
  const difficultyRating = parseFloat(beatmap.difficultyrating).toFixed(2);
  await lobby.channel.sendMessage(
    `Now playing [https://osu.ppy.sh/beatmapsets/${beatmap.beatmapset_id}#${beatmap.mode}/${beatmap.beatmap_id} ${beatmap.title}] ${difficultyRating}*`
  );
  await lobby.setMap(beatmap.beatmap_id, beatmap.mode);
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

export const manageLobby = async (lobby: BanchoLobby) => {
  await lobby.updateSettings();
  const uuid = randomUUID();
  lobbies[uuid] = lobby;
  store.getState().createLobby(uuid, {
    slots: [],
    winCondition: lobby.winCondition,
    minStars: 3,
    maxStars: 5,
    skipRequests: 0,
    mode: Mode.osu,
  });

  const matchFinished = () => queueMap(uuid);
  const matchAborted = () => queueMap(uuid);
  const allPlayersReady = () => lobby.startMatch();
  const channelMessage = (message: BanchoMessage) => {
    for (const messageHandler of [difficultyMessage(uuid), echoMessage]) {
      const isHandled = messageHandler.trigger(message);
      if (isHandled) {
        messageHandler.effect(message);
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

  store.subscribe(
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

  store.subscribe(
    (state) => [state.lobbies[uuid].minStars, state.lobbies[uuid].maxStars],
    async ([minStars, maxStars]) => {
      const [{ result }] = (await db.query(
        "SELECT difficultyrating FROM beatmap WHERE beatmap_id = $beatmap_id",
        {
          beatmap_id: lobby.beatmapId,
        }
      )) as any;
      const [beatmap] = result;
      if (
        minStars > beatmap.difficultyrating ||
        maxStars < beatmap.difficultyrating
      ) {
        await setRandomBeatmap(uuid);
      }
    }
  );

  await lobby.clearHost();
  await queueMap(uuid);
};
