const pool = require('./src/config/db.js');
pool.query(`ALTER TABLE request_header ADD COLUMN pengambilan_oleh VARCHAR(50);`, (err, res) => {
    if (err) console.error(err);
    else console.log('Column pengambilan_oleh added successfully');
    process.exit();
});
