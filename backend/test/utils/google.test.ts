import { fetchDataFromSheet } from '../../utils/google';

const mockSheetId = 'mockSheetId';
const mockRange = 'Form Responses 1';
const transformedDataInd = [
  ['Identifier', 'Name', 'Team', 'Comments'],
  ['Row1Cell1', 'ROW1CELL2', '1', 'Row1Cell4'],
  ['Row2Cell1', 'ROW2CELL2', '2', 'Row2Cell4'],
];
const transformedDataTeam = [
  ['Team', 'Comments'],
  ['1', 'Row1Cell4'],
  ['2', 'Row2Cell4'],
];

process.env.GOOGLE_CLIENT_EMAIL = 'mockEmail';
process.env.GOOGLE_PRIVATE_KEY = 'mockKey';

jest.mock('googleapis', () => ({
  google: {
    auth: {
      JWT: function () {
        return {
          authorize: jest.fn().mockResolvedValue(undefined),
        };
      },
    },
    sheets: function () {
      return {
        spreadsheets: {
          values: {
            get: jest.fn().mockResolvedValue({
              data: {
                values: [
                  ['Identifier', 'Name', 'Team', 'Comments', 'Others'],
                  ['Row1Cell1', 'Row1Cell2', '1', 'Row1Cell4', 'Row1Cell5'],
                  ['Row2Cell1', 'Row2Cell2', '2', 'Row2Cell4', 'Row2Cell5'],
                ],
              },
            }),
          },
        },
      };
    },
  },
}));

describe('Google Utils', () => {
  describe('fetchDataFromSheet', () => {
    it('fetches data from a sheet and transforms it (individual)', async () => {
      const data = await fetchDataFromSheet(mockSheetId, mockRange, false);
      expect(data).toEqual(transformedDataInd);
    });

    it('fetches data from a sheet and transforms it (team)', async () => {
      const data = await fetchDataFromSheet(mockSheetId, mockRange, true);
      expect(data).toEqual(transformedDataTeam);
    });

    it('throws an error if GOOGLE_CLIENT_EMAIL is not set', async () => {
      process.env.GOOGLE_CLIENT_EMAIL = '';
      await expect(fetchDataFromSheet(mockSheetId, mockRange)).rejects.toThrow(
        'Google credentials not found'
      );
    });
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});
