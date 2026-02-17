import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    googleId: { type: String, unique: true, sparse: true },
    telegramId: { type: Number, unique: true, sparse: true },
    email: { type: String, unique: true, sparse: true },
    name: String,
    weightStart: Number,
    goal: Number,
    targetDate: Date,
    isRegistered: { type: Boolean, default: false },
    last_data: {
        weight: Number,
        date: Date,
        mess_id: Number,
        weight_delta: Number,
    },
    createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
