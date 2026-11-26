import { parentPort, workerData } from 'node:worker_threads';
import { createClient } from '@libsql/client/web';

const client = createClient(workerData);
let transaction;
parentPort.on('message', async ({ port, signal, operation, sql, args }) => {
  try {
    let result;
    if (operation === 'exec' && sql === 'BEGIN IMMEDIATE') {
      transaction = await client.transaction('write');
    } else if (operation === 'exec' && (sql === 'COMMIT' || sql === 'ROLLBACK')) {
      const current = transaction;
      if (sql === 'COMMIT') await current.commit();
      else await current?.rollback();
      transaction = undefined;
    } else if (operation === 'exec') {
      await (transaction || client).executeMultiple(sql);
    } else {
      const response = await (transaction || client).execute({ sql, args });
      const rows = response.rows.map(row => Object.fromEntries(response.columns.map(column => [column, row[column]])));
      result = operation === 'get' ? rows[0] : operation === 'all' ? rows : {
        changes: response.rowsAffected,
        lastInsertRowid: response.lastInsertRowid,
      };
    }
    port.postMessage({ result });
  } catch (error) {
    port.postMessage({ error: { message: error.message, code: error.code } });
  } finally {
    Atomics.store(signal, 0, 1);
    Atomics.notify(signal, 0);
    port.close();
  }
});
