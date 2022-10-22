import type { BanchoMessage, BanchoMultiplayerChannel } from "bancho.js";
import { client } from "./global.js";
import { manageLobby, splitWhitespace } from "./utilities.js";
import { ok } from "assert";
import store from "./store.js";

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
      await message.user.sendMessage("Usage: !host <room_id>");
      await message.user.sendMessage("Example: !host 104507018");
      return;
    }
    await message.user.sendMessage("Taking control!");
    const channel = client.getChannel(channelName) as BanchoMultiplayerChannel;
    await channel.join();
    await manageLobby(channel.lobby);
  },
};

export const difficultyMessage = (uuid: string): MessageHandler<null> => ({
  trigger: (message) => {
    if (message.message.indexOf("!stars") === 0) {
      return [true, null];
    }
    return [false, null];
  },
  effect: async (message) => {
    let minStars, maxStars;
    try {
      const components = splitWhitespace(message.message);
      minStars = parseFloat(components[1]);
      maxStars = parseFloat(components[2]);
    } catch {
      await message.user.sendMessage("Invalid arguments for !stars.");
      await message.user.sendMessage("Usage: !stars <min_stars> <max_stars>");
      await message.user.sendMessage("Example: !stars 5 6.5");
    }
    store.getState().updateLobbyStarRating(uuid, minStars, maxStars);
  },
});
