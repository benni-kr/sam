if (typeof Storage !== "undefined") {
  let store: Record<string, string> = {};
  Storage.prototype.getItem = function (key: string) {
    return store[key] ?? null;
  };
  Storage.prototype.setItem = function (key: string, value: string) {
    store[key] = String(value);
  };
  Storage.prototype.removeItem = function (key: string) {
    delete store[key];
  };
  Storage.prototype.clear = function () {
    store = {};
  };
  Storage.prototype.key = function (index: number) {
    return Object.keys(store)[index] ?? null;
  };
  Object.defineProperty(Storage.prototype, "length", {
    get: function () {
      return Object.keys(store).length;
    },
    configurable: true,
  });

  const storageInstance = Object.create(Storage.prototype);
  Object.defineProperty(window, "localStorage", {
    value: storageInstance,
    writable: true,
  });
  if (typeof globalThis !== "undefined") {
    Object.defineProperty(globalThis, "localStorage", {
      value: storageInstance,
      writable: true,
    });
  }
}
