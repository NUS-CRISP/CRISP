import React from 'react';
import { Text } from '@mantine/core';

interface CourseInfoProps {
  course: {
    name: string;
    code: string;
    semester: string;
  };
}

const CourseInfo: React.FC<CourseInfoProps> = ({ course }) => {
  return (
    <div>
      <Text variant="h1">Course Name: {course.name}</Text>
      <Text variant="h1">Course Code: {course.code}</Text>
      <Text variant="h1">Semester: {course.semester}</Text>
    </div>
  );
};

export default CourseInfo;