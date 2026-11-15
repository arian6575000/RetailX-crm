// Db adapter over sql.js (SQLite compiled to WebAssembly) so the REAL Repo code runs in the browser preview.
import type { Db } from '../../src/db/schema';
export function fromSqlJs(sdb: any): Db {
  const all = (sql: string, p: any[] = []) => { const st = sdb.prepare(sql); st.bind(p); const out: any[] = []; while (st.step()) out.push(st.getAsObject()); st.free(); return out; };
  return {
    async execAsync(sql) { sdb.exec(sql); },
    async runAsync(sql, p = []) { sdb.run(sql, p); const id = all('SELECT last_insert_rowid() AS i')[0].i; return { lastInsertRowId: id, changes: sdb.getRowsModified() }; },
    async getAllAsync(sql, p) { return all(sql, p) as any; },
    async getFirstAsync(sql, p) { return (all(sql, p)[0] as any) ?? null; },
    async withTransactionAsync(task) { sdb.exec('BEGIN'); try { await task(); sdb.exec('COMMIT'); } catch (e) { sdb.exec('ROLLBACK'); throw e; } },
  };
}
