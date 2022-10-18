import type { BanchoMessage, BanchoMultiplayerChannel } from "bancho.js";
import { client } from "./services";
import {
  addBeatmap,
  manageLobby,
  parseBeatmapMessage,
  splitWhitespace,
} from "./utilities";
import { ok } from "assert";

type MessageHandler<V> = {
  trigger: (message: BanchoMessage) => [true, V] | [false, null];
  effect: (message: BanchoMessage, value: V) => Promise<void>;
};

export const echoMessage: MessageHandler<string> = {
  trigger: (message) => {
    if (message.message.indexOf("!echo") === 0) {
      return [true, message.message.slice(6)];
    }
    return [false, null];
  },
  effect: (message, string) => message.user.sendMessage(string),
};

export const addBeatmapMessage: MessageHandler<number> = {
  trigger: (message) => {
    const beatmapId = parseBeatmapMessage(message.message);
    if ((typeof beatmapId === "number") == !Number.isNaN(beatmapId)) {
      return [true, beatmapId];
    }
    return [false, null];
  },
  effect: async (message, beatmapId) => {
    const beatmapWasAdded = await addBeatmap(beatmapId);
    if (beatmapWasAdded) {
      await message.user.sendMessage("The beatmap was added successfully");
    } else {
      await message.user.sendMessage("That beatmap was already in the pool");
    }
  },
};

export const aboutMessage: MessageHandler<null> = {
  trigger: (message) => [message.message.trimEnd() === "!about", null],
  effect: (message) =>
    message.user.sendMessage(
      "(WORK IN PROGRESS) This bot automatically picks maps for you to keep the lobby running quickly."
    ),
};

export const fallbackMessage: MessageHandler<null> = {
  trigger: (message) => [message.user.id !== client.getSelf().id, null],
  effect: (message) =>
    message.user.sendMessage("I'm sorry, I don't understand that command."),
};

export const hostMessage: MessageHandler<null> = {
  trigger: (message) => [message.message.indexOf("!host") === 0, null],
  effect: async (message) => {
    let channelName;
    try {
      const components = splitWhitespace(message.message);
      ok(components.length === 2);
      channelName = `#mp_${parseInt(components[1], 10)}`;
    } catch {
      await message.user.sendMessage("Invalid arguments for !host.");
      await message.user.sendMessage(
        "Usage: !host <room_id> <min_stars> <max_stars>"
      );
      await message.user.sendMessage("Example: !host 104507018 5 6.5");
      return;
    }
    await message.user.sendMessage("Taking control!");
    const channel = client.getChannel(channelName) as BanchoMultiplayerChannel;
    await channel.join();
    await manageLobby(channel.lobby);
  },
};
