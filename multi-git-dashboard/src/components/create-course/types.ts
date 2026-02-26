import { CourseType } from '@shared/types/Course';

export interface CreateCourseFormValues {
  name: string;
  code: string;
  semester: string;
  startDate: Date | null;
  duration: number;
  courseType: CourseType;
  gitHubOrgName: string;
  repoNameFilter: string;
  installationId: string;
  isOn: boolean;
  customisedAI: boolean;
  provider: string;
  model: string;
  apiKey: string;
  frequency: string;
  aiStartDate: Date | null;
}
