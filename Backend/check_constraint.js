const pool = require('./src/config/db.js');
pool.query(`SELECT pg_get_constraintdef(c.oid) AS constraint_def FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'request_header' AND c.conname = 'request_header_status_check';`, (err, res) => {
    if (err) console.error(err);
    else console.log(res.rows);
    process.exit();
});
