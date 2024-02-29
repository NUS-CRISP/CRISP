import { Title } from '@mantine/core';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [sessionId] = useState(() => uuidv4());

  const logSessionTime = async (newTab: string, isTabClosing: boolean) => {
    if (newTab === active && !isTabClosing) return;
    const endTime = new Date();
    const sessionTime = endTime.getTime() - startTime.getTime();

    await fetch('/api/metrics/tab-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tabSessionData: {
          course: courseId,
          tab: active,
          sessionStartTime: startTime,
          sessionEndTime: endTime,
          sessionDuration: sessionTime,
          sessionId: sessionId,
        },
      }),
    });

    setStartTime(endTime);
  };

  const determineActiveTab = (path: string) => {
    if (path.startsWith('/courses/[id]/people')) {
      return 'People';
    } else if (path.startsWith('/courses/[id]/teams')) {
      return 'Teams';
    } else if (path.startsWith('/courses/[id]/timeline')) {
      return 'Timeline';
    } else if (path.startsWith('/courses/[id]/assessments')) {
      return 'Assessments';
    } else if (path.startsWith('/courses/[id]')) {
      return 'Overview';
    } else {
      return '';
    }
  };

  useEffect(() => {
    const newTab = determineActiveTab(router.pathname);
    logSessionTime(newTab, false);
    setActive(newTab);
  }, [router.pathname]);

  useEffect(() => {
    const handleTabClose = (event: Event) => {
      event.preventDefault();
      logSessionTime(active, true);
    };

    window.addEventListener('beforeunload', handleTabClose);

    return () => {
      window.removeEventListener('beforeunload', handleTabClose);
    };
  }, [active]);

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

  const links = linksData.map(item => (
    <a
      className={classes.link}
      data-active={item.label === active || undefined}
      href={item.link}
      key={item.label}
      onClick={event => {
        event.preventDefault();
        logSessionTime(item.label, false);
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
