const pool = require('./src/config/db.js');
pool.query(`ALTER TABLE request_header DROP CONSTRAINT request_header_status_check; ALTER TABLE request_header ADD CONSTRAINT request_header_status_check CHECK (status IN ('pending', 'approved', 'processing', 'waiting_pickup', 'completed', 'rejected'));`, (err, res) => {
    if (err) console.error(err);
    else console.log('Constraint updated successfully');
    process.exit();
});
