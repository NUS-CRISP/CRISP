import { google } from 'googleapis';
import { GaxiosResponse } from 'gaxios';
import { sheets_v4 } from 'googleapis/build/src/apis/sheets/v4';
import { TransformedData } from '@shared/types/SheetsData';

const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(
  /\\n/g,
  '\n'
);

type SheetRow = Record<string, string>;
type SheetDataType = SheetRow[];

export const fetchDataFromSheets = async (
  sheetIds: string[],
  joinOnColumn: string
): Promise<TransformedData> => {
  try {
    const sheets = await authenticateGoogleSheets();

    const sheetDataPromises = sheetIds.map(sheetId =>
      getSheetData(sheets, sheetId)
    );
    const sheetDataArray: SheetDataType[] =
      await Promise.all(sheetDataPromises);

    const data: TransformedData = transformFunction(
      sheetDataArray,
      joinOnColumn
    );

    return data;
  } catch (error) {
    console.error((error as Error).message);
    return [[]];
  }
};

const authenticateGoogleSheets = async (): Promise<sheets_v4.Sheets> => {
  const auth = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    undefined,
    GOOGLE_PRIVATE_KEY,
    ['https://www.googleapis.com/auth/spreadsheets.readonly']
  );

  await auth.authorize();

  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
};

const getSheetData = async (
  sheets: sheets_v4.Sheets,
  sheetId: string
): Promise<SheetDataType> => {
  const response: GaxiosResponse<sheets_v4.Schema$ValueRange> =
    await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      valueRenderOption: 'FORMATTED_VALUE',
      majorDimension: 'ROWS',
    });

  const rows: string[][] = response.data.values || [];
  const headers: string[] = rows.shift() || [];

  const sheetData: SheetDataType = rows.map(rowArray => {
    const rowObject: SheetRow = {};
    rowArray.forEach((value, index) => {
      const key = headers[index];
      if (key) {
        rowObject[key] = value;
      }
    });
    return rowObject;
  });

  return sheetData;
};

const initializeRowArray = (
  headers: string[],
  initialData?: SheetRow
): string[] => {
  const rowArray = new Array(headers.length).fill('');
  if (initialData) {
    headers.forEach((header, index) => {
      if (initialData[header] !== undefined) {
        rowArray[index] = initialData[header];
      }
    });
  }
  return rowArray;
};

const transformFunction = (
  sheetsData: SheetDataType[],
  joinOnColumn: string
): TransformedData => {
  const combinedData: Record<string, SheetRow> = {};
  const headersSet = new Set<string>();

  sheetsData.forEach(sheet => {
    Object.keys(sheet[0]).forEach(header => headersSet.add(header));
  });

  const headers = [
    joinOnColumn,
    ...Array.from(headersSet).filter(header => header !== joinOnColumn),
  ];

  sheetsData.forEach(sheetData => {
    sheetData.forEach(row => {
      const identifier = row[joinOnColumn];
      if (!identifier) return;

      if (!combinedData[identifier]) {
        combinedData[identifier] = {};
      }

      headers.forEach(header => {
        if (header === 'Comments' && combinedData[identifier][header]) {
          combinedData[identifier][header] += `; ${row[header] || ''}`;
        } else if (
          !combinedData[identifier][header] ||
          header === joinOnColumn
        ) {
          combinedData[identifier][header] = row[header] || '';
        }
      });
    });
  });

  const rows: TransformedData = Object.values(combinedData).map(row =>
    initializeRowArray(headers, row)
  );

  return [headers, ...rows];
};
