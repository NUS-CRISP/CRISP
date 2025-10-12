import { getTutorialHighlightColor } from '@/lib/utils';
import {
  Alert,
  Center,
  FloatingPosition,
  Stack,
  Title,
  Tooltip,
  UnstyledButton,
  rem,
} from '@mantine/core';
import {
  IconBell,
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
import { Course } from '@shared/types/Course';
import { IconInfoCircle } from '@tabler/icons-react';
import CrispRole from '@shared/types/auth/CrispRole';
import NotificationSettingsForm from './forms/NotificationSettingsForm';

interface NavbarLinkProps {
  icon: typeof IconHome2;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: (event: React.MouseEvent) => void;
  popoverOpened?: boolean;
}

interface CourseLink {
  link: string;
  label: string;
  disabled?: boolean;
  pngSrc: string;
}

const NavbarLink = forwardRef<HTMLButtonElement, NavbarLinkProps>(
  ({ icon: Icon, label, active, disabled, onClick, popoverOpened }, ref) =>
    popoverOpened ? (
      <UnstyledButton
        onClick={onClick}
        style={disabled ? { cursor: 'default' } : undefined}
        className={classes.link}
        data-active={active || undefined}
        ref={ref}
      >
        <Icon style={{ width: rem(20), height: rem(20) }} stroke={1.5} />
      </UnstyledButton>
    ) : (
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
  const { curTutorialStage, nextTutorialStage } = useTutorialContext();

  const router = useRouter();
  const { pathname } = router;
  const { data: session } = useSession();

  const isCourseRoute = pathname.includes('/courses/[id]');
  const courseId = isCourseRoute ? (router.query.id as string) : null;

  const [peopleAdded, setPeopleAdded] = useState(false);
  const [alertOpened, setAlertOpened] = useState(false);

  const [activeMainTab, setActiveMainTab] = useState('Home');
  const [courseCode, setCourseCode] = useState('');

  const [activeCourseTab, setActiveCourseTab] = useState('Overview');
  const [startTime, setStartTime] = useState<Date>(new Date());

  const [mainLinkPopoverOpened, setMainLinkPopoverOpened] = useState(false);
  const [questionPopoverOpened, setQuestionPopoverOpened] = useState(false);

  const [notificationModalOpened, setNotificationModalOpened] = useState(false);

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}`);
        const data: Course = await response.json();

        if (data.students.length > 0) {
          setPeopleAdded(true);
        } else {
          setPeopleAdded(false);
        }
      } catch (error) {
        console.error('Failed to fetch course data:', error);
      }
    };

    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

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
    } else if (path.startsWith('/courses/[id]/repositories')) {
      return 'Repositories';
    } else if (path.startsWith('/courses/[id]/teams')) {
      return 'Teams';
    } else if (path.startsWith('/courses/[id]/timeline')) {
      return 'Timeline';
    } else if (
      path.startsWith('/courses/[id]/assessments') ||
      path.startsWith('/courses/[id]/internal-assessments')
    ) {
      return 'Assessments';
    } else if (path.startsWith('/courses/[id]/project-management')) {
      return 'Project Management';
    } else if (path.startsWith('/courses/[id]/class-overview')) {
      return 'Class Overview';
    } else if (path.startsWith('/courses/[id]/code-analysis')) {
      return 'Code Analysis';
    } else if (path.startsWith('/courses/[id]/pr-overview')) {
      return 'PR Overview';
    } else if (path.startsWith('/courses/[id]/peer-review')) {
      return 'Peer Review';
    } else if (path.startsWith('/courses/[id]')) {
      return 'Team Review';
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
  if (session?.user?.crispRole === CrispRole.Admin) {
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
      popoverOpened={mainLinkPopoverOpened}
    />
  ));

  const courseLinksData = [
    {
      link: `/courses/${courseId}/class-overview`,
      label: 'Class Overview',
      disabled: !peopleAdded,
      pngSrc: '/class-overview.png',
    },
    {
      link: `/courses/${courseId}`,
      label: 'Team Review',
      disabled: !peopleAdded,
      pngSrc: '/team-view.png',
    },
    {
      link: `/courses/${courseId}/pr-overview`,
      label: 'PR Overview',
      disabled: !peopleAdded,
      pngSrc: '/timeline.png',
    },
    {
      link: `/courses/${courseId}/code-analysis`,
      label: 'Code Analysis',
      disabled: !peopleAdded,
      pngSrc: '/code-analysis.png',
    },
    {
      link: `/courses/${courseId}/people`,
      label: 'People',
      pngSrc: '/people.png',
    },
    {
      link: `/courses/${courseId}/repositories`,
      label: 'Repositories',
      pngSrc: '/repositories.png',
    },
    {
      link: `/courses/${courseId}/teams`,
      label: 'Teams',
      disabled: !peopleAdded,
      pngSrc: '/teams.png',
    },
    {
      link: `/courses/${courseId}/timeline`,
      label: 'Timeline',
      disabled: !peopleAdded,
      pngSrc: '/timeline.png',
    },
    {
      link: `/courses/${courseId}/project-management`,
      label: 'Project Management',
      disabled: !peopleAdded,
      pngSrc: '/jira.png',
    },
    {
      link: `/courses/${courseId}/assessments`,
      label: 'Assessments',
      disabled: !peopleAdded,
      pngSrc: '/assessments.png',
    },
    {
      link: `/courses/${courseId}/peer-review`,
      label: 'Peer Review',
      disabled: !peopleAdded,
      pngSrc: '/peer-review.png',
    },
  ];

  const renderNavLink = (
    item: CourseLink,
    stage?: number,
    position?: string,
    label?: string,
    hideButton: boolean = false
  ) => {
    const navLinkContent = (
      <a
        className={classes.courseLink}
        data-active={item.label === activeCourseTab || undefined}
        href={item.link}
        onClick={event => {
          event.preventDefault();
          if (!item.disabled) {
            logSessionTime(item.label, false);
            setActiveCourseTab(item.label);
            router.push(item.link);
            if (
              [10, 12, 14, 21, 23].includes(curTutorialStage) &&
              curTutorialStage === stage
            ) {
              nextTutorialStage();
            }
          } else {
            setAlertOpened(true); // Show alert if people are not added
          }
        }}
        style={{
          ...(item.disabled ? { cursor: 'not-allowed', opacity: 0.5 } : {}),
          padding: '6px 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ marginLeft: '5px' }}>{item.label}</span>
        </div>
      </a>
    );

    return stage && position && label ? (
      <TutorialPopover
        stage={stage}
        position={position as FloatingPosition}
        key={item.label}
        disabled={item.label !== label || curTutorialStage !== stage}
        hideButton={hideButton}
      >
        {navLinkContent}
      </TutorialPopover>
    ) : (
      navLinkContent
    );
  };

  const courseLinks = [];

  // First section: Class Overview, Team Review, PR Overview, Code Analysis, Project Management
  courseLinks.push(
    renderNavLink(courseLinksData[1], 6, 'top-start', 'Team Review')
  );
  courseLinks.push(
    renderNavLink(courseLinksData[0], 12, 'top-start', 'Class Overview', true)
  );
  courseLinks.push(
    renderNavLink(courseLinksData[2], 10, 'top-start', 'PR Overview', true)
  );
  courseLinks.push(
    renderNavLink(courseLinksData[3], 14, 'top-start', 'Code Analysis', true)
  );
  courseLinks.push(
    renderNavLink(
      courseLinksData[8],
      21,
      'top-start',
      'Project Management',
      true
    )
  );

  courseLinks.push(
    <div
      key="divider-1"
      style={{
        height: '1px',
        backgroundColor: '#e0e0e0',
        margin: '2px 0',
        width: '100%',
      }}
    />
  );

  // Second section: People, Repositories, Teams, Timeline
  courseLinksData.slice(4, 8).forEach(item => {
    courseLinks.push(renderNavLink(item));
  });

  // Second divider
  courseLinks.push(
    <div
      key="divider-2"
      style={{
        height: '1px',
        backgroundColor: '#e0e0e0',
        margin: '10px 0',
        width: '100%',
      }}
    />
  );

  // Third section: Assessment, Peer Reviews
  courseLinks.push(
    renderNavLink(courseLinksData[9], 23, 'top-start', 'Assessments', true)
  );
  courseLinks.push(
    renderNavLink(courseLinksData[10], 23, 'top-start', 'Peer Review', true)
  );

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
          <Center
            className={classes.logo}
            onClick={() => router.push('/')}
            style={{ cursor: 'pointer' }}
          >
            <IconGitBranch size={30} />
          </Center>

          <div className={classes.navbarMain}>
            <TutorialPopover
              stage={2}
              position="right"
              onOpen={() => setMainLinkPopoverOpened(true)}
              onClose={() => setMainLinkPopoverOpened(false)}
            >
              <Stack
                justify="center"
                gap={0}
                style={{
                  width: '50px',
                  borderRadius: 10,
                  backgroundColor: getTutorialHighlightColor(2),
                }}
              >
                {mainLinks}
              </Stack>
            </TutorialPopover>
          </div>

          <TutorialPopover
            stage={3}
            position="right"
            onOpen={() => setQuestionPopoverOpened(true)}
            onClose={() => setQuestionPopoverOpened(false)}
          >
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
                popoverOpened={questionPopoverOpened}
              />

              <NavbarLink
                onClick={() => setNotificationModalOpened(true)}
                icon={IconBell}
                label="Configure Notifications"
                popoverOpened={questionPopoverOpened}
              />

              <TutorialPopover stage={25} position="right-end" w={250} finish>
                <NavbarLink
                  onClick={() =>
                    window.open('https://forms.gle/41KcH8gFh3uDfzQGA', '_blank')
                  }
                  icon={IconHelp}
                  label="Submit issue / feature"
                  popoverOpened={questionPopoverOpened}
                />
              </TutorialPopover>

              <NavbarLink
                onClick={handleSignOut}
                icon={IconLogout}
                label="Sign out"
                popoverOpened={questionPopoverOpened}
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
              width: '180px',
              backgroundColor: getTutorialHighlightColor(5),
              paddingTop: '5px',
            }}
          >
            <div className={classes.navbarMain}>
              <Title
                order={3}
                className={classes.title}
                style={{
                  marginBottom: '12px',
                  marginTop: '0px',
                  backgroundColor: getTutorialHighlightColor(5),
                }}
              >
                {courseCode}
              </Title>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
              >
                {courseLinks}
              </div>
            </div>
          </nav>
        </TutorialPopover>
      )}

      <Alert
        icon={<IconInfoCircle />}
        title="Action Required"
        color="blue"
        withCloseButton
        onClose={() => setAlertOpened(false)}
        style={{
          display: alertOpened ? 'block' : 'none',
          width: '300px',
          position: 'absolute',
          top: '50%',
          left: '800px',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
        }}
      >
        <p>You need to add people for this course first.</p>
      </Alert>

      <NotificationSettingsForm
        opened={notificationModalOpened}
        onClose={() => setNotificationModalOpened(false)}
      />
    </div>
  );
};

export default Navbar;
