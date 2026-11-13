import koffi from "koffi";

export function createWin32Input() {
  if (process.platform !== "win32" || process.arch !== "x64") {
    throw new Error("Native input currently requires Windows x64");
  }
  const mouse = koffi.struct({
    dx: "int32",
    dy: "int32",
    mouseData: "uint32",
    flags: "uint32",
    time: "uint32",
    extra: "uintptr_t",
  });
  const keyboard = koffi.struct({
    vk: "uint16",
    scan: "uint16",
    flags: "uint32",
    time: "uint32",
    extra: "uintptr_t",
  });
  const hardware = koffi.struct({ message: "uint32", low: "uint16", high: "uint16" });
  const input = koffi.struct({ type: "uint32", data: koffi.union({ mouse, keyboard, hardware }) });
  const layout = { size: koffi.sizeof(input), dataOffset: koffi.offsetof(input, "data") };
  if (layout.size !== 40 || layout.dataOffset !== 8 || koffi.offsetof(mouse, "extra") !== 24) {
    throw new Error("Unexpected Win32 INPUT ABI layout");
  }
  const point = koffi.struct({ x: "int32", y: "int32" });
  const rect = koffi.struct({ left: "int32", top: "int32", right: "int32", bottom: "int32" });
  const user = koffi.load("user32.dll");
  const foreground = user.func("uintptr_t __stdcall GetForegroundWindow()");
  const cursor = user.func("__stdcall", "GetCursorPos", "int", [koffi.out(koffi.pointer(point))]);
  const clientRect = user.func("__stdcall", "GetClientRect", "int", [
    "uintptr_t",
    koffi.out(koffi.pointer(rect)),
  ]);
  const toScreen = user.func("__stdcall", "ClientToScreen", "int", [
    "uintptr_t",
    koffi.inout(koffi.pointer(point)),
  ]);
  const metric = user.func("int __stdcall GetSystemMetrics(int index)");
  const asyncKey = user.func("int16 __stdcall GetAsyncKeyState(int key)");
  const send = user.func("uint32 __stdcall SendInput(uint32 count, const void *events, int size)");

  return {
    layout,
    version: koffi.version,
    foreground: () => BigInt(foreground()),
    held: (key: number) => (Number(asyncKey(key)) & 0x8000) !== 0,
    cursor() {
      const value = { x: 0, y: 0 };
      if (!cursor(value)) throw new Error("GetCursorPos failed");
      return value;
    },
    client(handle: bigint) {
      const bounds = { left: 0, top: 0, right: 0, bottom: 0 };
      const origin = { x: 0, y: 0 };
      if (!clientRect(handle, bounds) || !toScreen(handle, origin))
        throw new Error("Client geometry unavailable");
      return { ...origin, width: bounds.right - bounds.left, height: bounds.bottom - bounds.top };
    },
    desktop() {
      return {
        x: Number(metric(76)),
        y: Number(metric(77)),
        width: Number(metric(78)),
        height: Number(metric(79)),
      };
    },
    mouse(flags: number, x = 0, y = 0) {
      const buffer = Buffer.alloc(layout.size);
      buffer.writeInt32LE(x, layout.dataOffset);
      buffer.writeInt32LE(y, layout.dataOffset + 4);
      buffer.writeUInt32LE(flags, layout.dataOffset + 12);
      return Number(send(1, buffer, layout.size));
    },
    shift(down: boolean) {
      const buffer = Buffer.alloc(layout.size);
      buffer.writeUInt32LE(1);
      buffer.writeUInt16LE(0x10, layout.dataOffset);
      buffer.writeUInt32LE(down ? 0 : 2, layout.dataOffset + 4);
      return Number(send(1, buffer, layout.size));
    },
  };
}

export type Win32Input = ReturnType<typeof createWin32Input>;
