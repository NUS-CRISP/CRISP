import { google } from 'googleapis';
import { GaxiosResponse } from 'gaxios';
import { sheets_v4 } from 'googleapis/build/src/apis/sheets/v4';

const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

type SheetRow = Record<string, string>;
type SheetDataType = SheetRow[];
type JoinedDataType = Record<string, Record<string, string>>;

export const fetchDataFromSheets = async (sheetIds: string[]) => {
  try {
    const auth = await authenticateGoogleSheets();

    const sheetDataPromises = sheetIds.map(sheetId =>
      getSheetData(auth, sheetId)
    );
    const sheetDataArray: SheetDataType[] =
      await Promise.all(sheetDataPromises);

    const joinedData: JoinedDataType = transformFunction(sheetDataArray);

    return { data: joinedData };
  } catch (error) {
    return { error: (error as Error).message };
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
    sheetId: string,
  ): Promise<SheetDataType> => {
    const response: GaxiosResponse<sheets_v4.Schema$ValueRange> =
      await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        valueRenderOption: 'FORMATTED_VALUE',
        majorDimension: 'ROWS',
      });

    const rows: string[][] = response.data.values || [];
    const headers: string[] = rows.shift() || [];

    const sheetData: SheetDataType = rows.map((rowArray) => {
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

const transformFunction = (sheetsData: SheetDataType[]): JoinedDataType => {
  const combinedData: JoinedDataType = {};

  sheetsData.forEach(sheetData => {
    sheetData.forEach(row => {
      const identifier = row['identifier'];
      if (!identifier) {
        return;
      }
      if (!combinedData[identifier]) {
        combinedData[identifier] = { ...row };
      } else {
        Object.keys(row).forEach(key => {
          if (key === 'Comments') {
            const existingComments = combinedData[identifier][key];
            combinedData[identifier][key] = existingComments
              ? `${existingComments};${row[key]}`
              : row[key];
          } else if (!combinedData[identifier][key]) {
            combinedData[identifier][key] = row[key];
          }
        });
      }
    });
  });

  return combinedData;
};
