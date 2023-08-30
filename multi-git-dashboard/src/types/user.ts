export interface User {
  _id: string;
  name: string;
  email: string;
}

export interface CourseDetails{
  courseId: string;
  gitHandle: string;
  teamNumber: number;
}

export interface Student extends User {
  courseDetails: Record<string, CourseDetails>;
}

export interface Assistant extends User {
  isHeadAssistant : boolean;
  teamNumber: number;
}

export interface Lecturer extends User {
  isCourseCoordinator : boolean;
}
