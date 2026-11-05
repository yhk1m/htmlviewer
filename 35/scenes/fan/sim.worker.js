import { simulate, simulateGurye } from './sim.js';

self.onmessage = async ({ data: { site } }) => {
  try {
    const say = text => self.postMessage({ type: 'progress', text });
    const result = site === 'gurye'
      ? simulateGurye(new Uint16Array(await (await fetch(new URL('./data/gurye-dem.bin', import.meta.url))).arrayBuffer()), say)
      : simulate(say);
    const transfer = [result.base.buffer, result.mountain.buffer];
    for (const s of result.stages) transfer.push(s.h.buffer, s.splatA.buffer, s.splatB.buffer, s.forest.buffer, s.water.buffer);
    self.postMessage({ type: 'done', result }, transfer);
  } catch (e) {
    self.postMessage({ type: 'error', message: e.message });
  }
};
