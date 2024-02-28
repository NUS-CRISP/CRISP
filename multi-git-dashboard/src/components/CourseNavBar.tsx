import { Title } from '@mantine/core';
import { useRouter } from 'next/router';
import { useState } from 'react';
import classes from '../styles/Sidebar.module.css';

interface CourseNavBarProps {
  courseId: string;
  courseCode: string;
}

const CourseNavBar: React.FC<CourseNavBarProps> = ({
  courseId,
  courseCode,
}) => {
  const router = useRouter();
  const [active, setActive] = useState('Home');

  const linksData = [
    { link: `/courses/${courseId}`, label: 'Overview' },
    { link: `/courses/${courseId}/people`, label: 'People' },
    { link: `/courses/${courseId}/teams`, label: 'Teams' },
    { link: `/courses/${courseId}/timeline`, label: 'Timeline' },
    { link: `/courses/${courseId}/assessments`, label: 'Assessments' },
  ];

  const links = linksData.map(item => (
    <a
      className={classes.link}
      data-active={item.label === active || undefined}
      href={item.link}
      key={item.label}
      onClick={event => {
        event.preventDefault();
        setActive(item.label);
        router.push(item.link);
      }}
    >
      <span>{item.label}</span>
    </a>
  ));

  return (
    <nav className={classes.courseNavbar}>
      <div className={classes.navbarMain}>
        <Title order={3} className={classes.title}>
          {courseCode}
        </Title>
        {links}
      </div>
    </nav>
  );
};

export default CourseNavBar;
