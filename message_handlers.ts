import type { BanchoMessage, BanchoMultiplayerChannel } from "bancho.js";
import { client } from "./global.js";
import { manageLobby, splitWhitespace } from "./utilities.js";
import { ok } from "assert";
import store from "./store.js";

type MessageHandler = {
  trigger: (message: BanchoMessage) => boolean;
  effect: (message: BanchoMessage) => Promise<void>;
};

export const echoMessage: MessageHandler = {
  trigger: (message) => message.message.startsWith("!echo "),
  effect: async (message) => {
    await message.user.sendMessage(message.message.slice(6));
  },
};

export const aboutMessage: MessageHandler = {
  trigger: (message) => message.message.startsWith("!about "),
  effect: async (message) => {
    await message.user.sendMessage(
      "(WORK IN PROGRESS) This bot automatically picks maps for you to keep the lobby running quickly."
    );
  },
};

export const hostMessage: MessageHandler = {
  trigger: (message) => message.message.startsWith("!host "),
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

export const difficultyMessage = (uuid: string): MessageHandler => ({
  trigger: (message) => message.message.startsWith("!stars "),
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
