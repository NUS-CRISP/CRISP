import React from 'react';
import CourseForm from '../components/forms/CourseForm'
import RootLayout from '@/components/RootLayout';

const CreateCoursePage: React.FC = () => {
  return (
    <RootLayout>
      <div>
        <h1>Create a New Course</h1>
        <CourseForm />
      </div>
    </RootLayout>
  );
};

export default CreateCoursePage;