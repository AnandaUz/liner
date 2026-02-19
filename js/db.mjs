import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const { MONGODB_USER, MONGODB_PASSWORD, MONGODB_DB } = process.env;

const MONGO_URI =
    `mongodb+srv://${MONGODB_USER}:${MONGODB_PASSWORD}` +
    `@cluster0.vqcukp6.mongodb.net/${MONGODB_DB}?retryWrites=true&w=majority`;


const globalCache = globalThis.__mongooseCache || (globalThis.__mongooseCache = {
    conn: null,
    promise: null
});

export async function connectDB() {
    if (globalCache.conn) {
        return globalCache.conn;
    }
    if (!globalCache.promise) {
        globalCache.promise = mongoose.connect(MONGO_URI)
            .then((mongooseInstance) => mongooseInstance);
    }
    try {
        globalCache.conn = await globalCache.promise;
        console.log('MongoDB connected');
        return globalCache.conn;
    } catch (err) {
        globalCache.promise = null;
        console.error('MongoDB connection error:', err);
        throw err;
    }
}
