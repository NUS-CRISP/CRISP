import React from 'react';
import styles from "../styles/course-card.module.css";

interface CourseCardProps {
  key: string;
  courseName: string;
  courseCode: string;
}

const CourseCard: React.FC<CourseCardProps> = ({ key, courseName, courseCode }) => {
  return (
    <div className="course-card">
      <h2 className="course-title">{courseName}</h2>
      <p className="course-code">Course Code: {courseCode}</p>
    </div>
  );
};

export default CourseCard;