const mc = require("minecraft-protocol");

const [, , host, port, username] = process.argv;
if (!host || !port) {
  console.error("Usage: node client_chat.js <host> <port> <username>");
  console.error(
    "Usage (offline mode): node client_chat.js <host> <port> offline"
  );
  process.exit(1);
}

const client = mc.createClient({
  host,
  port,
  username,
  auth: username === "offline" ? "offline" : "microsoft",
});

// Boilerplate
client.on("disconnect", function (packet) {
  console.log("Disconnected from server : " + packet.reason);
});

client.on("error", function (err) {
  console.log("Error occurred");
  console.log(err);
  process.exit(1);
});

client.on("connect", () => {
  /*
  const ChatMessage = require("prismarine-chat")(client.version);

  console.log("Connected to server");
  rl.prompt();
	
  client.on(
    "playerChat",
    function ({
      senderName,
      plainMessage,
      unsignedContent,
      formattedMessage,
      verified,
    }) {
      let content;

      const allowInsecureChat = true;

      if (formattedMessage) content = JSON.parse(formattedMessage);
      else if (allowInsecureChat && unsignedContent)
        content = JSON.parse(unsignedContent);
      else content = { text: plainMessage };

      const chat = new ChatMessage(content);
      console.log(
        senderName,
        { trugie: "Verified:", false: "UNVERIFIED:" }[verified] || "",
        chat.toAnsi()
      );
    }
  );
	*/

  client.on("packet", (data, packetMeta, buffer, fullBuffer) => {
    console.log(packetMeta, data);
    if (packetMeta.name == 'success') {process.exit()} //whoopie
    if (packetMeta.name == 'disconnect') {process.exit()

    } // dang its whitelist
  });
});

client.on("end", console.log);

// Send the queued messages
const queuedChatMessages = [];
client.on("state", function (newState) {
  if (newState === mc.states.PLAY) {
    queuedChatMessages.forEach((message) => client.chat(message));
    queuedChatMessages.length = 0;
  }
});
