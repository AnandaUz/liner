import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const { MONGODB_USER, MONGODB_PASSWORD, MONGODB_DB } = process.env;

const MONGO_URI =
    `mongodb+srv://${MONGODB_USER}:${MONGODB_PASSWORD}` +
    `@cluster0.vqcukp6.mongodb.net/${MONGODB_DB}?retryWrites=true&w=majority`;


let isConnected = false;

export async function connectDB() {
    if (isConnected) {
        return;
    }
    try {
        await mongoose.connect(MONGO_URI);
        isConnected = true;
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection error:', err);
    }
}