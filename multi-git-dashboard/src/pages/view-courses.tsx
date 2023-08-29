import React, { useState, useEffect } from 'react';
import CourseCard from '@/components/CourseCard';
import { Course } from '@/types/course';
import Link from 'next/link';

const backendPort = process.env.BACKEND_PORT || 3001;
const apiUrl = `http://localhost:${backendPort}/api/courses`;

const CourseListPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
      } else {
        console.error('Error fetching courses:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  }

  return (
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <div>
        <h1>Course List</h1>
        {courses.length === 0 ? (
          <p>{apiUrl}</p>
        ) : (
          <div className="course-card-list">
            {courses.map(course => (
              <Link key={course._id} href={`/view-course/${course._id}`}>
                <CourseCard
                  key={course._id}
                  courseName={course.courseName}
                  courseCode={course.courseCode}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
      </main>
  );
};

export default CourseListPage;