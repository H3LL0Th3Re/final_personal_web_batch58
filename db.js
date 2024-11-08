//for deployment
const { Pool } = require('pg');
require('dotenv').config(); // This loads your .env file with DATABASE_URL for production

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use the DATABASE_URL provided by Vercel
  ssl: {
    rejectUnauthorized: false, // Vercel (and other cloud services) require SSL
  },
});

// Test the connection
pool.connect((err) => {
  if (err) {
    console.error('Error connecting to PostgreSQL database:', err);
  } else {
    console.log('Connected to PostgreSQL database');
  }
});

module.exports = pool;


const { Pool } = require('pg');

//for local
// const pool = new Pool({
//   user: 'db_user',
//   host: 'localhost',
//   database: 'db_name',
//   password: 'db_pw',
//   port: 5432, // Default PostgreSQL port
// });

// pool.connect((err) => {
//     if (err) {
//       console.error('Error connecting to PostgreSQL database:', err);
//     } else {
//       console.log('Connected to PostgreSQL database');
//     }
// });


// module.exports = pool;
