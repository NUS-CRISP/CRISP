import { Box, Group, Center, Title, Stack } from '@mantine/core';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import classes from '@/styles/course-overview.module.css';
import ProfileDropdown from './ProfileDropdown';
import BackLink from './shared/BackLink';
import CrispLogo from './shared/CrispLogo';
import CrispIcon from './shared/CrispIcon';

const TopBar: React.FC = () => {
  const router = useRouter();
  const { pathname, asPath, query } = router;

  const courseId = (query.id as string) || undefined;
  const isCourseRoute = pathname.startsWith('/courses/') && !!courseId;

  const [courseNameCode, setCourseNameCode] = useState<string | null>(null);
  const [courseMeta, setCourseMeta] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourseMeta = async () => {
      if (!courseId) return;

      try {
        const res = await fetch(`/api/courses/${courseId}`);
        if (!res.ok) return;
        const data = await res.json();
        const code = data.code ?? '';
        const semester = data.semester ?? '';
        const name = data.name ?? '';
        const meta = code && name ? `${code} ${name}` : code || name || null;
        setCourseNameCode(meta);
        setCourseMeta(semester);
      } catch {
        // fail silently, top bar is non-critical
      }
    };

    if (isCourseRoute && courseId) {
      fetchCourseMeta();
    } else {
      // Leaving a course route, clear any stale course state
      setCourseNameCode(null);
      setCourseMeta(null);
    }
  }, [courseId, isCourseRoute]);

  const backLink = useMemo(() => {
    if (!isCourseRoute || !courseId) return null;
    const url = asPath.split('?')[0];
    const segments = url.split('/').filter(Boolean);
    if (segments.length <= 2) {
      return { href: '/courses', label: 'Dashboard' };
    }
    const rest = segments.slice(2);
    if (rest[0] === 'team-analytics' && rest.length === 1) {
      return { href: `/courses/${courseId}`, label: 'Course Overview' };
    }
    if (rest[0] === 'team-analytics' && rest.length >= 2) {
      return {
        href: `/courses/${courseId}/team-analytics`,
        label: 'All Teams',
      };
    }
    if (rest[0] === 'internal-assessments' && rest.length >= 2) {
      return {
        href: `/courses/${courseId}/assessments`,
        label: 'Assessments',
      };
    }
    return { href: `/courses/${courseId}`, label: 'Course Overview' };
  }, [asPath, courseId, isCourseRoute]);

  return (
    <Box className={classes.header}>
      <Box className={classes.headerInner}>
        <Box className={classes.headerInnerLeft}>
          <Box
            onClick={() => router.push('/courses')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            {isCourseRoute ? (
              <Center
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor =
                    'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                style={{
                  padding: 8,
                  borderRadius: 'var(--mantine-radius-md)',
                  transition: 'background-color 0.2s ease',
                }}
              >
                <CrispIcon size={45} />
              </Center>
            ) : (
              <CrispLogo />
            )}
          </Box>
          {isCourseRoute && backLink && (
            <Box className={classes.headerBackLink}>
              <BackLink href={backLink.href} label={backLink.label} />
            </Box>
          )}
        </Box>

        <Box className={classes.headerInnerCenter}>
          {isCourseRoute && (
            <Group
              className={classes.courseHeaderCenter}
              gap="l"
              wrap="wrap"
              align="center"
              justify="center"
              onClick={() => router.push(`/courses/${courseId}`)}
              style={{ cursor: 'pointer' }}
            >
              <Stack gap={2} align="center">
                {courseNameCode && (
                  <Title order={2} className={classes.courseCode}>
                    {courseNameCode}
                  </Title>
                )}
                {courseMeta && (
                  <Title order={4} className={classes.courseMeta}>
                    {courseMeta}
                  </Title>
                )}
              </Stack>
            </Group>
          )}
        </Box>

        <Box className={classes.headerInnerRight}>
          <ProfileDropdown />
        </Box>
      </Box>
    </Box>
  );
};

export default TopBar;
