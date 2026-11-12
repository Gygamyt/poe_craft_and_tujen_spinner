import { createApp } from "vue";
import App from "./App.vue";
import Overlay from "./Overlay.vue";
import PreviewControls from "./PreviewControls.vue";

const view = new URLSearchParams(window.location.search).get("view");
const component =
  view === "overlay" ? Overlay : view === "preview-controls" ? PreviewControls : App;
document.documentElement.classList.add(
  view === "overlay"
    ? "overlay-view"
    : view === "preview-controls"
      ? "preview-controls-view"
      : "main-view",
);
createApp(component).mount("#app");
