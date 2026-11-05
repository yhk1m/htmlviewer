export function runSim(site, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./sim.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') { onProgress(data.text); return; }
      worker.terminate();
      if (data.type === 'done') resolve(data.result);
      else reject(new Error(data.message));
    };
    worker.onerror = e => { worker.terminate(); reject(new Error(e.message)); };
    worker.postMessage({ site });
  });
}
