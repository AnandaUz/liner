import './config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';
import weightLogRoutes from './routes/weightLog.routes';
import telegramRoutes from './routes/telegram.routes';
import { bot } from './bot';

const app = express();

const port = process.env.PORT || 8080;

app.use(cors({
    origin: process.env.CLIENT_URL || ''
}));

app.get("/", (_req, res) => {
    res.send("работаю");
});
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/weightLog', weightLogRoutes);

app.post('/api/telegram/webhook', async (req, res) => {
  try {
    await bot.handleUpdate(req.body, res);
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(200).send('ok');
  }
});
app.use('/api/telegram', telegramRoutes);



app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    connectDB();
});
