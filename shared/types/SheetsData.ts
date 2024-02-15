export interface SheetsData {
    _id: string;
    fetchedAt: Date;
    headers: string[];
    rows: string[][];
}

export type TransformedData = string[][];