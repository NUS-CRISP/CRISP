import React, { useState, useEffect } from 'react';
import CourseCard from '@/components/courses/cards/CourseCard';
import { Course } from '@backend/models/Course';
import Link from 'next/link';
import { Button } from '@mantine/core';
import { useRouter } from 'next/router';

const CourseListPage: React.FC = () => {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch(
        `http://localhost:${process.env.NEXT_PUBLIC_BACKEND_PORT}/api/courses`
      );
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div>
        <h1>Courses</h1>
        {courses.length === 0 ? (
          <p>No courses to show</p>
        ) : (
          <div className="course-card-list">
            {courses.map(course => (
              <Link key={course._id.toString()} href={`/courses/${course._id}`}>
                <CourseCard
                  key={course._id.toString()}
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
          onClick={() => router.push('/courses/create')}
          style={{ marginTop: '16px' }}
        >
          Create Course
        </Button>
      </div>
    </main>
  );
};

export default CourseListPage;
