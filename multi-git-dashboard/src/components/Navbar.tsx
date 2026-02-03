import { getTutorialHighlightColor } from '@/lib/utils';
import { Alert, Center, FloatingPosition, Title } from '@mantine/core';
import { IconGitBranch } from '@tabler/icons-react';
import {
  IconLayoutDashboard,
  IconUsersGroup,
  IconGitPullRequest,
  IconCode,
  IconUsers,
  IconFolder,
  IconTimeline,
  IconCalendar,
  IconChecklist,
  IconMessagePlus,
} from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import classes from '../styles/Navbar.module.css';
import { useTutorialContext } from './tutorial/TutorialContext';
import TutorialPopover from './tutorial/TutorialPopover';
import { Course } from '@shared/types/Course';
import { IconInfoCircle } from '@tabler/icons-react';
import ProfileDropdown from './ProfileDropdown';

interface CourseLink {
  link: string;
  label: string;
  disabled?: boolean;
  icon: typeof IconGitBranch;
}

const Navbar: React.FC = () => {
  const { curTutorialStage, nextTutorialStage } = useTutorialContext();

  const router = useRouter();
  const { pathname } = router;

  const isCourseRoute = pathname.includes('/courses/[id]');
  const courseId = isCourseRoute ? (router.query.id as string) : null;

  const [peopleAdded, setPeopleAdded] = useState(false);
  const [alertOpened, setAlertOpened] = useState(false);

  const [activeMainTab, setActiveMainTab] = useState('Home');
  const [courseCode, setCourseCode] = useState('');

  const [activeCourseTab, setActiveCourseTab] = useState('Overview');
  const [startTime, setStartTime] = useState<Date>(new Date());

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
    } else if (path.startsWith('/courses/[id]/course-overview')) {
      return 'Course Overview';
    } else if (path.startsWith('/courses/[id]/code-analysis')) {
      return 'Code Analysis';
    } else if (path.startsWith('/courses/[id]/pr-review')) {
      return 'PR Review';
    } else if (path.startsWith('/courses/[id]')) {
      return 'Team Review';
    } else {
      return '';
    }
  };

  const courseLinksData = [
    {
      link: `/courses/${courseId}/course-overview`,
      label: 'Course Overview',
      disabled: !peopleAdded,
      icon: IconLayoutDashboard,
    },
    {
      link: `/courses/${courseId}`,
      label: 'Team Review',
      disabled: !peopleAdded,
      icon: IconUsersGroup,
    },
    {
      link: `/courses/${courseId}/pr-review`,
      label: 'PR Review',
      disabled: !peopleAdded,
      icon: IconGitPullRequest,
    },
    {
      link: `/courses/${courseId}/code-analysis`,
      label: 'Code Analysis',
      disabled: !peopleAdded,
      icon: IconCode,
    },
    {
      link: `/courses/${courseId}/people`,
      label: 'People',
      icon: IconUsers,
    },
    {
      link: `/courses/${courseId}/repositories`,
      label: 'Repositories',
      icon: IconFolder,
    },
    {
      link: `/courses/${courseId}/teams`,
      label: 'Teams',
      disabled: !peopleAdded,
      icon: IconUsersGroup,
    },
    {
      link: `/courses/${courseId}/timeline`,
      label: 'Timeline',
      disabled: !peopleAdded,
      icon: IconTimeline,
    },
    {
      link: `/courses/${courseId}/project-management`,
      label: 'Project Management',
      disabled: !peopleAdded,
      icon: IconCalendar,
    },
    {
      link: `/courses/${courseId}/assessments`,
      label: 'Assessments',
      disabled: !peopleAdded,
      icon: IconChecklist,
    },
    {
      link: `/courses/${courseId}/peer-review`,
      label: 'Peer Review',
      disabled: !peopleAdded,
      icon: IconMessagePlus,
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
          padding: '12px 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <item.icon style={{ width: 16, height: 16, marginRight: 10 }} />
          <span>{item.label}</span>
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

  // Navbar Order: Course Overview, Team Review, PR Review, Code Analysis, Project Management
  courseLinks.push(
    renderNavLink(courseLinksData[0], 6, 'top-start', 'Course Overview', true)
  );
  courseLinks.push(
    renderNavLink(courseLinksData[1], 12, 'top-start', 'Team Review')
  );
  courseLinks.push(
    renderNavLink(courseLinksData[2], 10, 'top-start', 'PR Review', true)
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
        margin: '2px 0',
        width: '100%',
      }}
    />
  );

  // Third section: Assessment, Peer Review
  courseLinks.push(
    renderNavLink(courseLinksData[9], 23, 'top-start', 'Assessments', true)
  );
  courseLinks.push(renderNavLink(courseLinksData[10]));

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
      {isCourseRoute && courseId && (
        <TutorialPopover stage={5} position="right">
          <nav
            className={classes.courseNavbar}
            style={{
              width: '200px',
              backgroundColor: getTutorialHighlightColor(5),
              paddingTop: '5px',
            }}
          >
            <div className={classes.navbarMain}>
              <Center
                onClick={() => router.push('/courses')}
                style={{
                  cursor: 'pointer',
                  flexDirection: 'row',
                  gap: '8px',
                  marginBottom: '8px',
                  padding: '8px',
                  alignItems: 'center',
                  borderRadius: 'var(--mantine-radius-md)',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor =
                    'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <IconGitBranch size={24} />
                <Title order={3}>CRISP</Title>
              </Center>

              <ProfileDropdown />
              <div
                key="divider"
                style={{
                  height: '1px',
                  backgroundColor: '#e0e0e0',
                  marginTop: '2px',
                  width: '100%',
                }}
              />

              <Title
                order={4}
                className={classes.title}
                style={{
                  margin: '0px',
                  backgroundColor: getTutorialHighlightColor(5),
                  padding: '16px',
                }}
              >
                {courseCode}
              </Title>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '10px 12px',
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
    </div>
  );
};

export default Navbar;
