import { getTutorialHighlightColor } from '@/lib/utils';
import {
  Center,
  Stack,
  Title,
  Tooltip,
  UnstyledButton,
  rem,
} from '@mantine/core';
import {
  IconGitBranch,
  IconHelp,
  IconHome2,
  IconListDetails,
  IconLogout,
  IconSettings2,
  IconUserCircle,
} from '@tabler/icons-react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { forwardRef, useEffect, useState } from 'react';
import classes from '../styles/Navbar.module.css';
import { useTutorialContext } from './tutorial/TutorialContext';
import TutorialPopover from './tutorial/TutorialPopover';

interface NavbarLinkProps {
  icon: typeof IconHome2;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: (event: React.MouseEvent) => void;
}

const NavbarLink = forwardRef<HTMLButtonElement, NavbarLinkProps>(
  ({ icon: Icon, label, active, disabled, onClick }, ref) => (
    <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
      <UnstyledButton
        onClick={onClick}
        style={disabled ? { cursor: 'default' } : undefined}
        className={classes.link}
        data-active={active || undefined}
        ref={ref}
      >
        <Icon style={{ width: rem(20), height: rem(20) }} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  )
);

const Navbar: React.FC = () => {
  const { curTutorialStage } = useTutorialContext();

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
    } else if (path.startsWith('/courses/[id]/project-management')) {
      return 'Project Management';
    } else if (path.startsWith('/courses/[id]/code-analysis')) {
      return 'Code Analysis';
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

  const mainLinks = mainLinksData.map(item => (
    <NavbarLink
      icon={item.icon}
      label={item.label}
      active={item.label === activeMainTab}
      onClick={event => {
        event.preventDefault();
        if (courseId) {
          logSessionTime(activeCourseTab, true);
        }
        setActiveMainTab(item.label);
        router.push(item.link);
      }}
      key={item.label}
    />
  ));

  const courseLinksData = [
    {
      link: `/courses/${courseId}`,
      label: 'Overview',
    },
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
    {
      link: `/courses/${courseId}/project-management`,
      label: 'Project Management',
    },
    {
      link: `/courses/${courseId}/code-analysis`,
      label: 'Code Analysis',
    },
  ];

  const courseLinks = courseLinksData.map(item => (
    <TutorialPopover
      stage={6}
      position="right"
      key={item.label}
      disabled={item.label !== 'Overview' || curTutorialStage !== 6}
    >
      <a
        className={classes.courseLink}
        data-active={item.label === activeCourseTab || undefined}
        href={item.link}
        onClick={event => {
          event.preventDefault();
          logSessionTime(item.label, false);
          setActiveCourseTab(item.label);
          router.push(item.link);
        }}
      >
        <span>{item.label}</span>
      </a>
    </TutorialPopover>
  ));

  useEffect(() => {
    const path = router.pathname;
    if (path.startsWith('/admin')) {
      setActiveMainTab('Admin');
    } else {
      setActiveMainTab('View Courses');
    }
    const newTab = determineActiveTab(path);
    setActiveCourseTab(newTab);
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
    const handleTabClose = () => logSessionTime(activeCourseTab, true);

    window.addEventListener('beforeunload', handleTabClose);

    return () => {
      window.removeEventListener('beforeunload', handleTabClose);
    };
  }, [activeCourseTab]);

  return (
    <div className={classes.navbarsContainer}>
      <TutorialPopover stage={1} position="right">
        <nav
          className={classes.navbar}
          style={{
            backgroundColor: getTutorialHighlightColor(1),
          }}
        >
          <Center>
            <IconGitBranch size={30} />
          </Center>

          <div className={classes.navbarMain}>
            <TutorialPopover stage={2} position="right">
              <Stack
                justify="center"
                gap={0}
                style={{
                  borderRadius: 10,
                  backgroundColor: getTutorialHighlightColor(2),
                }}
              >
                {mainLinks}
              </Stack>
            </TutorialPopover>
          </div>

          <TutorialPopover stage={3} position="right">
            <Stack
              justify="center"
              gap={0}
              style={{
                borderRadius: 10,
                backgroundColor: getTutorialHighlightColor(3),
              }}
            >
              <NavbarLink
                onClick={() => {}}
                icon={IconUserCircle}
                label={`Hello, ${
                  session && session.user ? session.user.name : 'user'
                }`}
                disabled
              />

              <TutorialPopover stage={11} position="right-end" w={250} finish>
                <NavbarLink
                  onClick={() =>
                    window.open('https://forms.gle/41KcH8gFh3uDfzQGA', '_blank')
                  }
                  icon={IconHelp}
                  label="Submit issue / feature"
                />
              </TutorialPopover>

              <NavbarLink
                onClick={handleSignOut}
                icon={IconLogout}
                label="Sign out"
              />
            </Stack>
          </TutorialPopover>
        </nav>
      </TutorialPopover>
      {isCourseRoute && courseId && (
        <TutorialPopover stage={5} position="right">
          <nav
            className={classes.courseNavbar}
            style={{
              backgroundColor: getTutorialHighlightColor(5),
            }}
          >
            <div className={classes.navbarMain}>
              <Title
                order={3}
                className={classes.title}
                style={{
                  backgroundColor: getTutorialHighlightColor(5),
                }}
              >
                {courseCode}
              </Title>
              {courseLinks}
            </div>
          </nav>
        </TutorialPopover>
      )}
    </div>
  );
};

export default Navbar;
