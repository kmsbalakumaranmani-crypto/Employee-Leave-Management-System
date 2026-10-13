const fs = require('fs');
const path = require('path');
const config = require('../config');
const { sqliteSchema, mysqlSchema } = require('./schema');
const { seedData } = require('./seed');

let activeEngine = 'sqlite';
let sqliteInstance = null;
let mysqlPool = null;

async function initDb() {
  if (config.DB_TYPE === 'mysql') {
    try {
      const mysql = require('mysql2/promise');
      mysqlPool = mysql.createPool({
        host: config.MYSQL.host,
        port: config.MYSQL.port,
        user: config.MYSQL.user,
        password: config.MYSQL.password,
        database: config.MYSQL.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      // Test connection
      const connection = await mysqlPool.getConnection();
      console.log(`🐬 Connected to MySQL database at ${config.MYSQL.host}:${config.MYSQL.port}/${config.MYSQL.database}`);
      connection.release();

      activeEngine = 'mysql';

      // Run schema statements
      const statements = mysqlSchema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const sql of statements) {
        await mysqlPool.query(sql);
      }
    } catch (err) {
      console.warn(`⚠️ MySQL connection failed (${err.message}). Falling back to built-in SQLite engine.`);
      activeEngine = 'sqlite';
      initSqlite();
    }
  } else {
    activeEngine = 'sqlite';
    initSqlite();
  }

  // Seed default data
  await seedData({ query, execute });
}

function initSqlite() {
  const { DatabaseSync } = require('node:sqlite');
  const dbDir = path.dirname(config.SQLITE_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  sqliteInstance = new DatabaseSync(config.SQLITE_PATH);
  sqliteInstance.exec('PRAGMA foreign_keys = ON;');
  sqliteInstance.exec(sqliteSchema);
  console.log(`📁 Connected to SQLite database at ${config.SQLITE_PATH}`);
}

async function query(sql, params = []) {
  if (activeEngine === 'mysql' && mysqlPool) {
    const [rows] = await mysqlPool.query(sql, params);
    return Array.isArray(rows) ? rows : [rows];
  }

  if (!sqliteInstance) {
    initSqlite();
  }
  const rows = sqliteInstance.prepare(sql).all(...params);
  return rows.map(r => ({ ...r }));
}

async function execute(sql, params = []) {
  if (activeEngine === 'mysql' && mysqlPool) {
    const [res] = await mysqlPool.query(sql, params);
    return {
      affectedRows: res.affectedRows || 0,
      insertId: res.insertId || 0
    };
  }

  if (!sqliteInstance) {
    initSqlite();
  }
  const res = sqliteInstance.prepare(sql).run(...params);
  return {
    affectedRows: res.changes || 0,
    insertId: Number(res.lastInsertRowid || 0)
  };
}

function getDbInfo() {
  return {
    engine: activeEngine,
    status: 'connected',
    location: activeEngine === 'mysql'
      ? `${config.MYSQL.host}:${config.MYSQL.port}/${config.MYSQL.database}`
      : config.SQLITE_PATH
  };
}

async function closeDb() {
  if (mysqlPool) {
    await mysqlPool.end();
  }
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
  }
}

module.exports = {
  initDb,
  query,
  execute,
  getDbInfo,
  closeDb
};
