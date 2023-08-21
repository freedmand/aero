import { Sprite, TilingSprite } from "pixi.js";
import { Aero } from "./aero";
import { fetchAndMergeDecks } from "./deck";

// Fetch any flashcard decks exported from Anki in txt format
const deck = await fetchAndMergeDecks();
// "./assets/deck.txt",

const aero = new Aero();
await aero.loadAssets();
aero.finalize();
aero.addToDOM();

aero.addDeck(deck);

const ws = new WebSocket("ws://localhost:8001");

ws.addEventListener("message", (e) => {
  // Expects a websocket server running at 8001 that
  // sends a pedal event every time the fan goes round
  // on the fan bike
  const data = JSON.parse(e.data);
  if (data.type === "pedal") {
    aero.pedal();
  }
});

// Wake lock to prevent screen from sleeping
function isScreenLockSupported() {
  return "wakeLock" in navigator;
}

async function getScreenLock() {
  if (isScreenLockSupported()) {
    let screenLock;
    try {
      screenLock = await navigator.wakeLock.request("screen");
    } catch (err) {
      console.log(err.name, err.message);
    }
    return screenLock;
  }
}
getScreenLock().then((x) => console.log("Screen locked", x));

// // Uncomment to simulate pedals
// document.body.addEventListener("keydown", (e) => {
//   if (e.key === " ") {
//     aero.pedal();
//     setTimeout(() => aero.pedal(), 200);
//   }
// });
