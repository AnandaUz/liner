export interface IWeightLog {
    _id?: string;
    date: Date;
    weight: number;
    comment?: string | undefined;
}