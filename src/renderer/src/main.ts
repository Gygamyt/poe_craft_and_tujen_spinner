import { createApp } from "vue";
import { App, Overlay, PreviewControls } from "../../features/calibration/ui";
import { InputProbe } from "../../features/testbed/ui";

const view = new URLSearchParams(window.location.search).get("view");
const component =
  view === "input-probe"
    ? InputProbe
    : view === "overlay"
      ? Overlay
      : view === "preview-controls"
        ? PreviewControls
        : App;
document.documentElement.classList.add(
  view === "overlay"
    ? "overlay-view"
    : view === "preview-controls"
      ? "preview-controls-view"
      : "main-view",
);
createApp(component).mount("#app");
