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
    { link: `/courses/${courseId}`, label: 'Overview', path: '/courses/[id]' },
    {
      link: `/courses/${courseId}/people`,
      label: 'People',
      path: '/courses/[id]/people',
    },
    {
      link: `/courses/${courseId}/teams`,
      label: 'Teams',
      path: '/courses/[id]/teams',
    },
    {
      link: `/courses/${courseId}/timeline`,
      label: 'Timeline',
      path: '/courses/[id]/timeline',
    },
    {
      link: `/courses/${courseId}/assessments`,
      label: 'Assessments',
      path: '/courses/[id]/assessments',
    },
  ];

  useEffect(() => {
    const path = router.pathname;
    const match = linksData.find(item => path.endsWith(item.path));
    if (match) {
      setActive(match.label);
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
