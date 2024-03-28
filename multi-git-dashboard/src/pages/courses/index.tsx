import CourseCard from '@/components/cards/CourseCard';
import { hasFacultyPermission } from '@/lib/auth/utils';
import { Button } from '@mantine/core';
import { Course } from '@shared/types/Course';
import styles from '@styles/courses.module.css';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const CourseListPage: React.FC = () => {
  const apiRoute = '/api/courses';

  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch(apiRoute, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Error fetching courses:', response.statusText);
      } else {
        const data = await response.json();
        setCourses(data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  return (
    <div className={styles.content}>
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
      {hasFacultyPermission() && (
        <div>
          <Button
            onClick={() => router.push('/courses/create')}
            mt={16}
          >
            Create Course
          </Button>
        </div>
      )}
    </div>
  );
};

export default CourseListPage;
