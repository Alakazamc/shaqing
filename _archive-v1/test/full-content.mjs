/* 测试 fixture：加载与浏览器相同的 manifest，并在同一封盘点运行。 */

export async function loadFullContent(BH) {
  BH.props.registerBuiltins();
  await import(new URL('../content/manifest.js', import.meta.url).href);
  for (const file of BH.MANIFEST) {
    await import(new URL('../' + file, import.meta.url).href);
  }
  BH.seal();
  return BH;
}

export function installMemoryStorage() {
  const data = new Map();
  globalThis.localStorage = {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(String(key), String(value)); },
    removeItem(key) { data.delete(String(key)); },
    clear() { data.clear(); },
    _data: data,
  };
  return globalThis.localStorage;
}

export async function loadSave(BH) {
  installMemoryStorage();
  // query 参数只用于让这个测试 fixture 与任何其他 import 隔离。
  await import(new URL('../src/ui/save.js?test=save', import.meta.url).href);
  return BH.save;
}
