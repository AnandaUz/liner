import mongoose from 'mongoose';

const weightLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    weight: Number,
    comment: {
        type: String,
        default: undefined
    }
});
weightLogSchema.index(
    { userId: 1, date: 1 },
    { unique: true }
);
weightLogSchema.pre('save', function(next) {
    if (this.comment === "" || this.comment === null) {
        this.comment = undefined; // Удаляет поле из итогового документа MongoDB
    }
    next();
});

export const WeightLog = mongoose.model('WeightLog', weightLogSchema);
