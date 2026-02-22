import mongoose, { Document, Model } from 'mongoose';

export interface IWeightLog extends Document {
    userId: mongoose.Types.ObjectId;
    date: Date;
    weight: number;
    comment?: string;
    opt1?: number;
    opt2?: number;
}

const weightLogSchema = new mongoose.Schema<IWeightLog>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    weight: Number,
    comment: {
        type: String,
        default: undefined
    },
    opt1: {
        type: Number,
        default: undefined
    },
    opt2: {
        type: Number,
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
    if ((this.opt1 as any) === null || (typeof this.opt1 === 'number' && Number.isNaN(this.opt1))) {
        this.opt1 = undefined;
    }
    if ((this.opt2 as any) === null || (typeof this.opt2 === 'number' && Number.isNaN(this.opt2))) {
        this.opt2 = undefined;
    }
});

export const WeightLog: Model<IWeightLog> = mongoose.models.WeightLog || mongoose.model<IWeightLog>('WeightLog', weightLogSchema);
