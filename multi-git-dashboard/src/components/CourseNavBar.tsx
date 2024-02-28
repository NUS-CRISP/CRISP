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
    { link: `/courses/${courseId}/`, label: 'Overview' },
    { link: `/courses/${courseId}/`, label: 'People' },
    { link: `/courses/${courseId}/`, label: 'Teams' },
    { link: `/courses/${courseId}/`, label: 'Timeline' },
    { link: `/courses/${courseId}/`, label: 'Assessments' },
  ];

  useEffect(() => {
    const storedActiveTab = localStorage.getItem('activeTabCourse');
    if (storedActiveTab) {
      setActive(storedActiveTab);
    }
  }, []);

  const handleLinkClick = (label: string, link: string) => {
    setActive(label);
    localStorage.setItem('activeTabCourse', label);
    router.push(link);
  };

  const links = linksData.map(item => (
    <a
      className={classes.link}
      data-active={item.label === active || undefined}
      href={item.link}
      key={item.label}
      onClick={event => {
        event.preventDefault();
        handleLinkClick(item.label, item.link);
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
