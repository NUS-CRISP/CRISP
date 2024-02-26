import { google } from 'googleapis';
import { GaxiosResponse } from 'gaxios';
import { sheets_v4 } from 'googleapis/build/src/apis/sheets/v4';
import { TransformedData } from '@shared/types/SheetData';

type SheetRow = Record<string, string>;
type SheetDataType = SheetRow[];

export const fetchDataFromSheet = async (
  sheetId: string
): Promise<TransformedData> => {
  const sheets = await authenticateGoogleSheets();

  const sheetData = await getSheetData(sheets, sheetId);

  const data: TransformedData = transformFunction(sheetData);

  return data;
};

const authenticateGoogleSheets = async (): Promise<sheets_v4.Sheets> => {
  const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
  const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(
    /\\n/g,
    '\n'
  );
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
  sheetId: string,
  range: string = 'Form Responses 1'
): Promise<SheetDataType> => {
  console.log(sheetId, range);
  const response: GaxiosResponse<sheets_v4.Schema$ValueRange> =
    await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
      valueRenderOption: 'FORMATTED_VALUE',
      majorDimension: 'ROWS',
    });

  const rows: string[][] = response.data.values || [];
  const headers: string[] = rows.shift() || [];

  const sheetData: SheetDataType = rows.map(rowArray => {
    const rowObject: SheetRow = {};
    rowArray.forEach((value, index) => {
      const key = headers[index];
      if (key && ['Identifier', 'Name', 'Team', 'Comments'].includes(key)) {
        rowObject[key] = value;
      }
    });
    return rowObject;
  });

  return sheetData;
};

const transformFunction = (sheetData: SheetDataType): TransformedData => {
  const combinedData: Record<string, string[]> = {};
  const headers = ['Identifier', 'Name', 'Team', 'Comments'];

  sheetData.forEach(row => {
    const identifier = row['Identifier'];
    if (!identifier) return;

    if (!combinedData[identifier]) {
      combinedData[identifier] = headers.map(header => row[header] || '');
    } else {
      headers.forEach((header, index) => {
        if (header === 'Comments') {
          combinedData[identifier][index] += combinedData[identifier][index]
            ? `; ${row[header]}`
            : row[header];
        } else {
          combinedData[identifier][index] = row[header] || '';
        }
      });
    }
  });

  const rows: string[][] = Object.values(combinedData);

  return [headers, ...rows];
};
