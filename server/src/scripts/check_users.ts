import { connectDB } from '../../../_base/server/db.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

async function check() {
    try {
        await connectDB();
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB is not connected');
        
        const collections = await db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));

        const user_v1_count = await db.collection('user_v1').countDocuments();
        console.log('Count in user_v1 (direct):', user_v1_count);

        const users_v1_count = await db.collection('users_v1').countDocuments();
        console.log('Count in users_v1 (direct):', users_v1_count);

        const users_count = await db.collection('users').countDocuments();
        console.log('Count in users (direct):', users_count);

        console.log('Using collection in model:', User.collection.name);
        const count = await User.countDocuments();
        console.log('User count in model collection:', count);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

check();
