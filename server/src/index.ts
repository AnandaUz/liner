import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';


dotenv.config({ path: '../.env' });

const app = express();

const port = process.env.PORT;

app.use(cors({
    origin: 'http://localhost:5173'
}));
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);


// API routes
app.get('/api/data', (req: Request, res: Response) => {
    res.json({
        message: 'Hello from Express API!',
        timestamp: new Date().toISOString(),
        data: [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' },
            { id: 3, name: 'Item 3' },
        ],
    });
});

connectDB();

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
