import mongoose, { Document, Model } from 'mongoose';

export interface IUser extends Document {
    googleId?: string;
    telegramId?: number;
    email?: string;
    name?: string;
    weightStart?: number;
    goal?: number;
    targetDate?: Date;
    isRegistered: boolean;
    last_data?: {
        weight?: number;
        date?: Date;
        mess_id?: number;
        weight_delta?: number;
    };
    createdAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
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

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
