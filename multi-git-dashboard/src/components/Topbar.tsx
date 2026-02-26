import { Box, Group, Center, Title, Stack } from '@mantine/core';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import classes from '@/styles/course-overview.module.css';
import ProfileDropdown from './ProfileDropdown';
import BackLink from './shared/BackLink';
import CrispLogo from './shared/CrispLogo';
import CrispIcon from './shared/CrispIcon';

// type Breadcrumb = {
//   label: string;
//   href?: string;
// };

// const formatSegmentLabel = (segment: string) => {
//   if (!segment) return '';

//   const map: Record<string, string> = {
//     'team-analytics': 'Team Analytics',
//     'peer-review': 'Peer Review',
//     assessments: 'Assessments',
//     repositories: 'Repositories',
//     people: 'People',
//     teams: 'Teams',
//     timeline: 'Timeline',
//     'project-management': 'Project Management',
//     'team-review': 'Team Review',
//     'pr-overview': 'PR Overview',
//     'code-analysis': 'Code Analysis',
//   };

//   if (map[segment]) return map[segment];

//   return segment
//     .split('-')
//     .map(s => s.charAt(0).toUpperCase() + s.slice(1))
//     .join(' ');
// };

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

  // const breadcrumbs: Breadcrumb[] = useMemo(() => {
  //   if (!isCourseRoute || !courseId) return [];

  //   const url = asPath.split('?')[0];
  //   const segments = url.split('/').filter(Boolean);

  //   // `/courses` or `/courses/[id]` – no breadcrumbs, just course header
  //   if (segments.length <= 2) {
  //     return [];
  //   }

  //   // segments: ['courses', '<id>', ...rest]
  //   const rest = segments.slice(2);

  //   const crumbs: Breadcrumb[] = [];

  //   // Always start in-course breadcrumbs from the overview page
  //   crumbs.push({ label: 'Overview', href: `/courses/${courseId}` });

  //   rest.forEach((seg, index) => {
  //     const isLast = index === rest.length - 1;
  //     const label = formatSegmentLabel(seg);

  //     if (!label) return;

  //     if (isLast) {
  //       crumbs.push({ label });
  //     } else {
  //       const href = `/${segments.slice(0, 2 + index + 1).join('/')}`;
  //       crumbs.push({ label, href });
  //     }
  //   });

  //   return crumbs;
  // }, [asPath, courseId, isCourseRoute]);

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
              {/* TODO: Choose backlink vs breadcrumbs */}
              <BackLink href={backLink.href} label={backLink.label} />
              {/* {breadcrumbs.length > 0 && (
                <Group gap={6} wrap="wrap" justify="center">
                  {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    return (
                      <Group
                        key={`${crumb.label}-${index}`}
                        gap={4}
                        wrap="nowrap"
                      >
                        {index > 0 && (
                          <Text size="sm" c="dimmed">
                            »
                          </Text>
                        )}
                        {crumb.href && !isLast ? (
                          <Anchor
                            size="sm"
                            c="dimmed"
                            onClick={e => {
                              e.preventDefault();
                              router.push(crumb.href!);
                            }}
                            href={crumb.href}
                          >
                            {crumb.label}
                          </Anchor>
                        ) : (
                          <Text
                            size="sm"
                            fw={isLast ? 500 : 400}
                            c={isLast ? undefined : 'dimmed'}
                          >
                            {crumb.label}
                          </Text>
                        )}
                      </Group>
                    );
                  })}
                </Group>
              )} */}
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
