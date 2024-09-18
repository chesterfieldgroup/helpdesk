// sql.js
const sql = require('mssql');

require('dotenv').config();

const config = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER,
    database: process.env.SQL_DATABASE,
    options: {
        encrypt: true
    }
};


// Function to connect to the database
async function connectToDatabase() {
    try {
        // Connect to the database
        await sql.connect(config);
        console.log('Connected to the database');
    } catch (err) {
        console.error('Error connecting to the database', err);
    }
}

// Function to execute SQL queries
async function executeQuery(query, params = {}) {
    try {
        const request = new sql.Request();
        
        // Add input parameters to the query
        for (const param in params) {
            request.input(param, params[param]);
        }

        const result = await request.query(query);
        return result.recordset;
    } catch (err) {
        console.error('Error executing query', err);
        throw err;
    }
}

module.exports = {
    connectToDatabase,
    executeQuery
};
