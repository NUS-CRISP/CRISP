import React from 'react';
import CourseForm from '@/components/Forms/CourseForm';

const CreateCoursePage: React.FC = () => {
  return (
    <div>
      <h1>Create a New Course</h1>
      <CourseForm />
    </div>
  );
};

export default CreateCoursePage;