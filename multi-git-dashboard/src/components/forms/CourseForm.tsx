import React, { useState } from 'react';
import axios from 'axios';

const backendPort = process.env.BACKEND_PORT || 3001;

const CourseForm: React.FC = () => {
  const [courseData, setCourseData] = useState({
    courseName: '',
    courseCode: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await axios.post('http://localhost:${backendPort}/api/courses', courseData);
      console.log('Course created:', response.data);
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