import { Title } from '@mantine/core';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
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
  const [active, setActive] = useState('Overview');

  const linksData = [
    { link: `/courses/${courseId}`, label: 'Overview' },
    {
      link: `/courses/${courseId}/people`,
      label: 'People',
    },
    {
      link: `/courses/${courseId}/teams`,
      label: 'Teams',
    },
    {
      link: `/courses/${courseId}/timeline`,
      label: 'Timeline',
    },
    {
      link: `/courses/${courseId}/assessments`,
      label: 'Assessments',
    },
  ];

  useEffect(() => {
    const path = router.pathname;
    if (path.startsWith('/courses/[id]/people')) {
      setActive('People');
    } else if (path.startsWith('/courses/[id]/teams')) {
      setActive('Teams');
    } else if (path.startsWith('/courses/[id]/timeline')) {
      setActive('Timeline');
    } else if (path.startsWith('/courses/[id]/assessments')) {
      setActive('Assessments');
    } else if (path.startsWith('/courses/[id]')) {
      setActive('Overview');
    }
  }, [router.pathname]);

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
