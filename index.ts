import { aboutMessage, echoMessage, hostMessage } from "./message_handlers.js";
import { client } from "./global.js";

client
  .connect()
  .then(async () => {
    console.log("We're online");
    client.on("PM", async (message) => {
      for (const messageHandler of [echoMessage, aboutMessage, hostMessage]) {
        const isHandled = messageHandler.trigger(message);
        if (isHandled) {
          await messageHandler.effect(message);
          break;
        }
      }
    });
  })
  .catch(console.error);
