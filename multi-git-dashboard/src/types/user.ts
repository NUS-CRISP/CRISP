export interface User {
  _id: string;
  name: string;
  email: string;
}

export interface Student extends User {
  gitHandle: string;
  teamNumber: number;
}

export interface Assistant extends User {
  isHeadAssistant : boolean;
  teamNumber: number;
}

export interface Lecturer extends User {
  isCourseCoordinator : boolean;
}
