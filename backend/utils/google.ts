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
  const headers = ['Identifier', 'Name', 'Team', 'Comments'];
  const rows: string[][] = [];

  sheetData.forEach(row => {
    const Identifier = row['Identifier'];
    if (!Identifier) return;

    const Name = row['Name'].toUpperCase() || 'EMPTY';
    let Team = row['Team'] || '';
    try {
      const teamInt = parseInt(Team);
      Team = teamInt.toString();
    } catch (error) {
      Team = 'EMPTY';
    }
    const Comments = row['Comments'] || 'EMPTY';
    rows.push([Identifier, Name, Team, Comments]);
  });

  rows.sort((a, b) => {
    const teamA = parseInt(a[2]) || Number.MAX_SAFE_INTEGER;
    const teamB = parseInt(b[2]) || Number.MAX_SAFE_INTEGER;
    const nameA = a[1];
    const nameB = b[1];

    if (teamA !== teamB) {
      return teamA - teamB;
    }
    return nameA.localeCompare(nameB);
  });

  return [headers, ...rows];
};
