const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',      // 또는 '127.0.0.1'
    user: 'mithon2025',     
    password: 'mithon2025admin',
    database: 'MITHON',     
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();  // async/await 가능
