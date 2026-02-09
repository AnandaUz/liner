import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    telegramId: { type: Number, unique: true },
    name: String,
    weightStart: Number,
    goal: Number,
    targetDate: Date,
    createdAt: { type: Date, default: Date.now }

});

export const User = mongoose.model('User', userSchema);
