import { Code, Group, Title } from '@mantine/core';
import {
  IconGitBranch,
  IconListDetails,
  IconLogout,
  IconSettings2,
  IconUserCircle,
} from '@tabler/icons-react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import classes from '../styles/Sidebar.module.css';

const Sidebar: React.FC = () => {
  const router = useRouter();
  const { pathname } = router;
  const { data: session } = useSession();

  const isCourseRoute = pathname.includes('/courses/[id]');
  const courseId = isCourseRoute ? (router.query.id as string) : null;

  const [activeMainTab, setActiveMainTab] = useState('Home');
  const [courseCode, setCourseCode] = useState('');

  const [activeCourseTab, setActiveCourseTab] = useState('Overview');
  const [startTime, setStartTime] = useState<Date>(new Date());

  const logSessionTime = async (newTab: string, isTabClosing: boolean) => {
    if (newTab === activeCourseTab && !isTabClosing) return;
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
          tab: activeCourseTab,
          sessionStartTime: startTime,
          sessionEndTime: endTime,
          sessionDuration: sessionTime,
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

  const handleSignOut = async () => {
    if (courseId) {
      logSessionTime(activeCourseTab, true);
    }
    await signOut();
  };

  const mainLinksData = [
    { link: '/courses', label: 'View Courses', icon: IconListDetails },
  ];
  if (session?.user?.role === 'admin') {
    mainLinksData.push({ link: '/admin', label: 'Admin', icon: IconSettings2 });
  }

  const courseLinksData = [
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
    if (path.startsWith('/admin')) {
      setActiveMainTab('Admin');
    } else {
      setActiveMainTab('View Courses');
    }
  }, [router.pathname]);

  useEffect(() => {
    const fetchCourse = async () => {
      if (courseId) {
        try {
          const response = await fetch(`/api/courses/${courseId}/code`);
          const data = await response.json();
          setCourseCode(data);
        } catch (error) {
          console.error('Failed to fetch course data:', error);
        }
      }
    };

    if (isCourseRoute) {
      fetchCourse();
    }
  }, [courseId, isCourseRoute]);

  useEffect(() => {
    const newTab = determineActiveTab(router.pathname);
    setActiveCourseTab(newTab);
  }, [router.pathname]);

  useEffect(() => {
    const handleTabClose = (event: Event) => {
      event.preventDefault();
      logSessionTime(activeCourseTab, true);
    };

    window.addEventListener('beforeunload', handleTabClose);

    return () => {
      window.removeEventListener('beforeunload', handleTabClose);
    };
  }, [activeCourseTab]);

  const mainLinks = mainLinksData.map(item => (
    <a
      className={classes.link}
      data-active={item.label === activeMainTab || undefined}
      href={item.link}
      key={item.label}
      onClick={event => {
        event.preventDefault();
        if (courseId) {
          logSessionTime(activeCourseTab, true);
        }
        setActiveMainTab(item.label);
        router.push(item.link);
      }}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </a>
  ));

  const courseLinks = courseLinksData.map(item => (
    <a
      className={classes.link}
      data-active={item.label === activeCourseTab || undefined}
      href={item.link}
      key={item.label}
      onClick={event => {
        event.preventDefault();
        logSessionTime(item.label, false);
        setActiveCourseTab(item.label);
        router.push(item.link);
      }}
    >
      <span>{item.label}</span>
    </a>
  ));

  return (
    <div className={classes.navbarsContainer}>
      <nav className={classes.navbar}>
        <div className={classes.navbarMain}>
          <Group className={classes.header} justify="space-between">
            <Group>
              <IconGitBranch size={28} />
              CRISP
            </Group>
            <Code fw={700}>v0.0.1</Code>
          </Group>
          {mainLinks}
        </div>

        <div className={classes.footer}>
          <a
            href="#"
            className={classes.link}
            style={{ pointerEvents: 'none' }}
            onClick={event => event.preventDefault()}
          >
            <IconUserCircle className={classes.linkIcon} stroke={1.5} />
            <span>
              Hello, {session && session.user ? session.user.name : 'user'}
            </span>
          </a>

          <a href="#" className={classes.link} onClick={handleSignOut}>
            <IconLogout className={classes.linkIcon} stroke={1.5} />
            <span>Logout</span>
          </a>
        </div>
      </nav>
      {isCourseRoute && courseId && (
        <nav className={classes.courseNavbar}>
          <div className={classes.navbarMain}>
            <Title order={3} className={classes.title}>
              {courseCode}
            </Title>
            {courseLinks}
          </div>
        </nav>
      )}
    </div>
  );
};

export default Sidebar;
