import CourseCard from '@/components/cards/CourseCard';
import { getApiUrl } from '@/lib/apiConfig';
import { Button } from '@mantine/core';
import { Course } from '@shared/types/Course';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const CourseListPage: React.FC = () => {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const apiUrl = getApiUrl() + '/courses';

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error('Error fetching courses:', response.statusText);
        return;
      }
      const data = await response.json();
      setCourses(data);
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
              <Link
                key={course._id.toString()}
                style={{ textDecoration: 'none' }}
                href={`/courses/${course._id}`}
              >
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
