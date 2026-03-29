import mongoose, { Document, Model } from 'mongoose';

export interface IWeightLog extends Document {
    userId: mongoose.Types.ObjectId;
    date: Date;
    weight: number;
    comment?: string | undefined;
}

const weightLogSchema = new mongoose.Schema<IWeightLog>({
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
weightLogSchema.pre<IWeightLog>('save', function() {
    if (this.comment === "" || (this.comment as any) === null) {
        this.comment = undefined; // Удаляет поле из итогового документа MongoDB
    }
});

export const WeightLog: Model<IWeightLog> = mongoose.models.WeightLog || mongoose.model<IWeightLog>('WeightLog', weightLogSchema);
