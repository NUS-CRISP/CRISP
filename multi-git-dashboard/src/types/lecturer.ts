import { User } from "./User";

export interface Lecturer extends User {
  isCourseCoordinator : boolean;
}
