import {
  aboutMessage,
  echoMessage,
  fallbackMessage,
  hostMessage,
} from "./message_handlers.js";
import { client } from "./global.js";

client
  .connect()
  .then(async () => {
    console.log("We're online");
    client.on("PM", async (message) => {
      for (const messageHandler of [
        echoMessage,
        aboutMessage,
        hostMessage,
        fallbackMessage,
      ]) {
        const [isHandled, value] = messageHandler.trigger(message);
        if (isHandled) {
          await (messageHandler as any).effect(message, value);
          break;
        }
      }
    });
  })
  .catch(console.error);

process.on("SIGINT", async () => {
  client.disconnect();
});
