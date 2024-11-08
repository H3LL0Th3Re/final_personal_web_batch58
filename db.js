const { Pool } = require('pg');

// Configure the PostgreSQL connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'web_card_db',
  password: 'Theo2905#',
  port: 5432, // Default PostgreSQL port
});

pool.connect((err) => {
    if (err) {
      console.error('Error connecting to PostgreSQL database:', err);
    } else {
      console.log('Connected to PostgreSQL database');
    }
});


module.exports = pool;
