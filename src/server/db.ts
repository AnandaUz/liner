import mongoose from 'mongoose';

// Only load dotenv for local development (when not in production/Cloud Run)
if (process.env.NODE_ENV !== 'production') {
    try {
        const { config } = await import('dotenv');
        config({ path: new URL('../.env', import.meta.url) });
    } catch (e) {
        console.warn('dotenv not found or .env file missing, relying on system environment variables');
    }
}

const { MONGODB_USER, MONGODB_PASSWORD, MONGODB_DB, MONGODB_URI } = process.env;

// Priority: MONGODB_URI (if provided as a full string), else construct it from individual components
const MONGO_URI = MONGODB_URI || 
    (`mongodb+srv://${MONGODB_USER}:${MONGODB_PASSWORD}` +
    `@cluster0.vqcukp6.mongodb.net/${MONGODB_DB}?retryWrites=true&w=majority`);


const globalCache = (globalThis as any).__mongooseCache || ((globalThis as any).__mongooseCache = {
    conn: null,
    promise: null
});

export async function connectDB(): Promise<typeof mongoose> {
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
