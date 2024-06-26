import { Course } from './Course';
import { Result } from './Result';
import { TeamSet } from './TeamSet';
import { SheetData } from './SheetData';

export interface Assessment {
  _id: string;
  course: Course;
  assessmentType: string;
  markType: string;
  results: Result[];
  frequency: string;
  granularity: 'individual' | 'team';
  teamSet: TeamSet;
  formLink: string;
  sheetID: string;
  sheetTab: string;
  sheetData: SheetData;
}
