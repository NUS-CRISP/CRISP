export type TransformedData = string[][];

export interface SheetData {
    _id: string;
    fetchedAt: Date;
    headers: string[];
    rows: string[][];
}