import React, { useState } from 'react';

const backendPort = process.env.BACKEND_PORT || 3001;
const apiUrl = `http://localhost:${backendPort}/api/courses`;

const CourseForm: React.FC = () => {
  const [courseData, setCourseData] = useState({
    courseName: '',
    courseCode: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(courseData),
      });
      const data = await response.json();
      console.log('Course created:', data);
    } catch (error) {
      console.error('Failed to create course:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCourseData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Course Name:</label>
        <input type="text" name="courseName" value={courseData.courseName} onChange={handleChange} />
      </div>
      <div>
        <label>Course Code:</label>
        <input type="text" name="courseCode" value={courseData.courseCode} onChange={handleChange} />
      </div>
      <button type="submit">Create Course</button>
    </form>
  );
};

export default CourseForm;