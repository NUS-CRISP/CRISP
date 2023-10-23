import React, { useState, useEffect } from 'react';
import CourseCard from '@/components/cards/CourseCard';
import { Course } from '@/types/course';
import Link from 'next/link';
import { Button } from '@mantine/core';
import CourseForm from '@/components/forms/CourseForm';

const backendPort = process.env.BACKEND_PORT || 3001;
const apiUrl = `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api/courses`;

const CourseListPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [showForm, setShowForm] = useState(false);

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
  };

  const handleCourseCreated = () => {
    fetchCourses();
    setShowForm(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div>
        <h1>Courses</h1>
        {courses.length === 0 ? (
          <p>No courses to show</p>
        ) : (
          <div className="course-card-list">
            {courses.map(course => (
              <Link key={course._id} href={`/courses/${course._id}`}>
                <CourseCard
                  key={course._id}
                  name={course.name}
                  code={course.code}
                  semester={course.semester}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
      <div>
        <Button
          onClick={() => setShowForm(!showForm)}
          style={{ marginTop: '16px' }}
        >
          {showForm ? 'Cancel' : 'Add Course'}
        </Button>
        {showForm && <CourseForm onCourseCreated={handleCourseCreated} />}
      </div>
    </main>
  );
};

export default CourseListPage;
