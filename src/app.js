import express from 'express';
import cors from 'cors';
import connection from './database/database.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

app.post("/sign-up", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const {rows:users} = await connection.query(`SELECT * FROM users`);
        if (users.some(c => c['email'] === email)){
          return res.sendStatus(409);
        };
        if (name && email && password){
            const passwordHash = bcrypt.hashSync(password, 12);
            await connection.query(`
            INSERT INTO users
            (name, email, password)
            VALUES ($1, $2, $3)
        `,[name, email, passwordHash]);
        } else {
            return res.sendStatus(400);
        };
        return res.sendStatus(201);
    } catch(e){
        console.log(e);
        res.sendStatus(500);
    };
});

app.post("/sign-in", async (req, res) => {
    try {
        const { email, password } = req.body;
    
        const result = await connection.query(`
            SELECT * FROM users
            WHERE email = $1
        `,[email]);
        const user = result.rows[0];

        if(user && bcrypt.compareSync(password, user.password)) {
            const token = uuidv4();
            await connection.query(`
                INSERT INTO sessions 
                ("userId", token)
                VALUES ($1, $2)
            `, [user.id, token]);
        
            const data = {
                user: {id: user.id, name: user.name, email: user.email}, 
                token
            };
            return res.send(data).status(200);
        } else {
            return res.sendStatus(401);
        };
    } catch(e){
        console.log(e);
        return res.sendStatus(500);
    };
});
app.post('/transactions', async (req,res) => {
    try{
        const authorization = req.headers['authorization'];
        const {type, amount, description} = req.body;
        const token = authorization?.replace('Bearer ', '');
        if (!authorization || !token){
            return res.sendStatus(403);
        };
        if (type !== 0 && type!==1){
            return res.sendStatus(400);
        };
        if (!amount){
            return res.sendStatus(400);
        };
        const {rows: user} = await connection.query(`
            SELECT * FROM sessions
            JOIN users
            ON sessions."userId" = users.id
            WHERE sessions.token = $1
        `, [token]);

        const userId = user[0].userId;
        
        if (!userId){
            return res.sendStatus(400);
        };
        await connection.query(`
                INSERT INTO transactions 
                ("userId", amount, description, type, date)
                VALUES ($1, $2, $3, $4, NOW())
        `, [userId, amount, description, type]);
        res.sendStatus(201);
    }catch(e){
        console.log(e);
        res.sendStatus(500);
    };
});
app.get('/transactions', async (req,res) => {
    try{
        const authorization = req.headers['authorization'];
        const token = authorization?.replace('Bearer ', '');
        if (!authorization || !token){
            return res.sendStatus(403);
        }

        const {rows: user} = await connection.query(`
            SELECT * FROM sessions
            JOIN users
            ON sessions."userId" = users.id
            WHERE sessions.token = $1
        `, [token]);
        
        const userId = user[0].userId;
        if (!userId){
            return res.sendStatus(400);
        }
        const {rows: transactions} = await connection.query(`
            SELECT * FROM transactions
            WHERE "userId" = $1
        `, [userId]);
        
        res.send(transactions);
    }catch(e){
        console.log(e);
        res.sendStatus(500);
    };
});
app.get('/balance', async (req,res) => {
    try{
        const authorization = req.headers['authorization'];
        const token = authorization?.replace('Bearer ', '');
        if (!authorization || !token){
            return res.sendStatus(403);
        }
        const {rows: user} = await connection.query(`
            SELECT * FROM sessions
            JOIN users
            ON sessions."userId" = users.id
            WHERE sessions.token = $1
        `, [token]);
        
        const userId = user[0].userId;
        if (!userId){
            return res.sendStatus(400);
        }
        const {rows: transactions} = await connection.query(`
            SELECT * FROM transactions
            WHERE "userId" = $1
        `, [userId]);

        let balance=0;
        for (let i = 0; i<transactions.length; i++){
            if (transactions[i].type === 0) {
                balance += transactions[i].amount;
            } else if (transactions[i].type === 1) {
                balance += -transactions[i].amount;
            }
        }
        const data = {balance};
        res.send(data);
    }catch(e){
        console.log(e);
        res.sendStatus(500);
    }
});
app.post('/sign-out', async (req,res) => {
    try{
        const authorization = req.headers['authorization'];
        const token = authorization?.replace('Bearer ', '');
        if (!authorization || !token){
            return res.sendStatus(403);
        }
        const {rows: user} = await connection.query(`
            SELECT * FROM sessions
            JOIN users
            ON sessions."userId" = users.id
            WHERE sessions.token = $1
        `, [token]);

        await connection.query(`
            DELETE FROM sessions
            WHERE "userId" = $1
        `, [user[0].id]);
        res.sendStatus(200);
    } catch(e){
        console.log(e);
        res.sendStatus(500);
    };
});
app.listen(4000, () => console.log('Server listening on port: 4000'));