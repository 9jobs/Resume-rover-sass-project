import { MessageChannel, Worker, receiveMessageOnPort } from 'node:worker_threads';
import path from 'node:path';

// Keep SQLite transactions within their existing synchronous call sites.
// The worker performs remote I/O while its caller waits for the result.
export function createTursoDatabase(root, url, authToken) {
  if (!url || !authToken) throw new Error('Turso credentials are missing');
  let worker;
  const close = () => {
    if (worker) void worker.terminate();
    worker = undefined;
  };
  function execute(operation, sql, args) {
    if (!worker) {
      worker = new Worker(path.join(root, 'features', 'turso-worker.mjs'), { workerData: { url, authToken } });
      const instance = worker;
      worker.on('error', () => { if (worker === instance) close(); });
      worker.unref();
    }
    const signal = new Int32Array(new SharedArrayBuffer(4));
    const { port1, port2 } = new MessageChannel();
    try {
      worker.postMessage({ port: port2, signal, operation, sql, args }, [port2]);
      if (Atomics.wait(signal, 0, 0, 8000) === 'timed-out') {
        close();
        throw Object.assign(new Error('Hosted storage request timed out. Refresh before retrying.'), { status: 503 });
      }
      const { result, error } = receiveMessageOnPort(port1).message;
      if (error) throw Object.assign(new Error(error.message), { code: error.code });
      return result;
    } finally {
      port1.close();
    }
  }
  return {
    close,
    exec: sql => execute('exec', sql),
    prepare: sql => ({
      get: (...args) => execute('get', sql, args),
      all: (...args) => execute('all', sql, args),
      run: (...args) => execute('run', sql, args),
    }),
  };
}
