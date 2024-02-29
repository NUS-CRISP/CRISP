import { Account } from '../Account';
import { Course } from '../Course';

export interface TabSession{
    account: Account;
    course: Course;
    tab: string;
    sessionStartTime: Date;
    sessionEndTime: Date;
    sessionDuration: number;
}
