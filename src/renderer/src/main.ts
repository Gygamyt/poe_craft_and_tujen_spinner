import { createApp } from "vue";
import App from "./App.vue";
import Overlay from "./Overlay.vue";

const isOverlay = new URLSearchParams(window.location.search).get("view") === "overlay";
document.documentElement.classList.add(isOverlay ? "overlay-view" : "main-view");
createApp(isOverlay ? Overlay : App).mount("#app");
