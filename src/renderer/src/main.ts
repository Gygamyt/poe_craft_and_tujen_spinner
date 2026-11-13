import { createApp } from "vue";
import { GameDataCatalog } from "../../features/game-data/ui";
import { App, Overlay, PreviewControls } from "../../features/calibration/ui";
import { InputProbe, Testbed } from "../../features/testbed/ui";

const view = new URLSearchParams(window.location.search).get("view");
const component =
  view === "catalog"
    ? GameDataCatalog
    : view === "testbed"
      ? Testbed
      : view === "input-probe"
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
