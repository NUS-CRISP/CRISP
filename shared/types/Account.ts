import { User } from './User';
import type { CrispRole } from './auth/CrispRole';
import type { CourseRoleTuple } from './auth/CourseRole';

export type NotificationPeriod = 'hourly' | 'daily' | 'weekly';

export interface Account {
  _id: string;
  email: string;
  emailNotificationType: NotificationPeriod;
  emailNotificationHour: number; // 0-23
  emailNotificationWeekday: number; // 1-7, from Monday to Sunday
  telegramChatId: number;
  telegramNotificationType: NotificationPeriod;
  telegramNotificationHour: number; // 0-23
  telegramNotificationWeekday: number; // 1-7, from Monday to Sunday
  password: string;
  crispRole: CrispRole;
  courseRoles: CourseRoleTuple[];
  isApproved: boolean;
  wantsEmailNotifications: boolean;
  wantsTelegramNotifications: boolean;
  user: User;
}
