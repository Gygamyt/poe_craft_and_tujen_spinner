# Calibrating the overlay

Use PoE in **borderless windowed** mode. Exclusive fullscreen is unsupported. The editor also works with PoE closed. It does not recognize the active game tab or follow the game window automatically.

## First calibration

1. Start the application with `npm run dev`, or build with `npm run build` and use `npm start` after stopping Vite.
2. Keep the application open. Select the layout and monitor in the panel. Monitor options show physical resolution and Windows scale; internal geometry uses DIP.
3. Choose General, Atlas or League. The inventory and selected stash page can be shown independently using the checkboxes.
4. Click **Редактировать**. The overlay receives mouse input while you calibrate. Drag a frame by its background or title; drag the white corner handles to resize it. The inventory always has 12 columns and 5 rows.
5. Click a stash slot to select it, then drag it or use its corner handles. The overlay toolbar shows its neutral ID/name and an enable/disable button. Disabled slots remain faintly visible in editing; they are omitted in preview.
6. Use the overlay toolbar to switch between all three stash pages. Each page keeps its own frame and slots. The large central item area is not a currency slot.
7. Click **Сохранить** in the overlay toolbar. After a successful write the application enters click-through preview. Activate the game yourself; mouse and keyboard input then belong to it.
8. Keep the app open to use the overlay. Use Alt+Tab to return to the panel; **Скрыть** hides the overlay. **Редактировать** starts a new draft. Escape or **Отмена** discards that draft and hides the overlay.
9. To check persistence, close the **control panel** after saving, then start the application again. Closing that panel also closes the overlay. The same layout/display calibration is restored; **Просмотр** shows it without another alignment.

If Save fails, the editor retains its draft and the old file remains intact. Retry Save or cancel the draft. Do not assume the draft was saved merely because its position changed on screen.

## Display changes

Frames are based on the selected monitor's current bounds, not a fixed screen resolution. The initial layout is a starting point: manually align it to the game UI, including on ultrawide screens. Pure tests cover standard and ultrawide resolutions at multiple Windows scales; physical acceptance remains a separate check.

Changing the selected display, display bounds, rotation or Windows scale hides an incompatible overlay and requires calibration for the new configuration. To verify this, **leave the app open** while changing Windows scale from 100% to 150% (and back); confirm the overlay hides and the panel reports recalibration. Then enter the editor and save for the new configuration. Old profiles are kept.

If the game window/UI position changes without a display change, manually recalibrate. There is no game-window tracking or automatic tab selection.

## Updating a layout

**Импорт раскладки…** opens a native JSON chooser. Canceling it changes nothing. Selecting a file prepares a summary; confirm or cancel that candidate in the panel. Importing a new version does not switch to it automatically. Select the desired version explicitly afterwards.

Geometry changes require a new `geometryVersion` and a separate calibration. To add future default names without resetting coordinates, import the same layout/version and identical geometry with `defaultLabel` values filled in. IDs remain stable, and slot order does not affect geometry comparison. See [layout format](calibration-layouts.md) and its checked example.

Extra Standard slots have no assigned current-league meaning. Disable unwanted slots without deleting them, and enable the same IDs again later if needed. The bundled neutral layout is based on the reference images, not a current-league currency catalogue.

## Recovering an unreadable workspace

The workspace lives in `calibration-workspace.json` under Electron's `userData`. If its JSON, format version or references are invalid, the original file is preserved and automatic writes are blocked. **Сбросить…** asks for confirmation before keeping a recovery copy and restoring the bundled catalogue. Cancel leaves existing data untouched.
