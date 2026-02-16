import { Box, Group, Text, Anchor } from '@mantine/core';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import classes from '@/styles/course-overview.module.css';
import ProfileDropdown from './ProfileDropdown';
import CrispLogo from './shared/CrispLogo';

type Breadcrumb = {
  label: string;
  href?: string;
};

const formatSegmentLabel = (segment: string) => {
  if (!segment) return '';

  const map: Record<string, string> = {
    'team-analytics': 'Team Analytics',
    'peer-review': 'Peer Review',
    assessments: 'Assessments',
    repositories: 'Repositories',
    people: 'People',
    teams: 'Teams',
    timeline: 'Timeline',
    'project-management': 'Project Management',
    'team-review': 'Team Review',
    'pr-overview': 'PR Overview',
    'code-analysis': 'Code Analysis',
  };

  if (map[segment]) return map[segment];

  return segment
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
};

const TopBar: React.FC = () => {
  const router = useRouter();
  const { pathname, asPath, query } = router;

  const isCourseRoute = pathname.startsWith('/courses');
  const courseId = (query.id as string) || undefined;

  const [courseCode, setCourseCode] = useState<string | null>(null);
  const [courseMeta, setCourseMeta] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourseMeta = async () => {
      if (!courseId) return;

      try {
        const res = await fetch(`/api/courses/${courseId}`);
        if (!res.ok) return;
        const data = await res.json();
        setCourseCode(data.code ?? null);

        const semester = data.semester ?? '';
        const name = data.name ?? '';
        const meta =
          semester && name ? `${semester} • ${name}` : semester || name || null;
        setCourseMeta(meta);
      } catch {
        // fail silently – top bar is non-critical
      }
    };

    if (isCourseRoute && courseId) {
      fetchCourseMeta();
    }
  }, [courseId, isCourseRoute]);

  const breadcrumbs: Breadcrumb[] = useMemo(() => {
    if (!isCourseRoute) return [];

    const url = asPath.split('?')[0];
    const segments = url.split('/').filter(Boolean);

    const crumbs: Breadcrumb[] = [{ label: 'Courses', href: '/courses' }];

    if (courseId && courseCode) {
      crumbs.push({ label: courseCode, href: `/courses/${courseId}` });
    }

    // segments: ['courses', '<id>', ...rest]
    if (segments.length <= 2) {
      crumbs.push({ label: 'Overview' });
      return crumbs;
    }

    const rest = segments.slice(2);

    rest.forEach((seg, index) => {
      const isLast = index === rest.length - 1;
      const label = formatSegmentLabel(seg);

      if (!label) return;

      if (isLast) {
        crumbs.push({ label });
      } else {
        const href = `/${segments.slice(0, 2 + index + 1).join('/')}`;
        crumbs.push({ label, href });
      }
    });

    return crumbs;
  }, [asPath, courseCode, courseId, isCourseRoute]);

  return (
    <Box className={classes.header}>
      <Group
        className={classes.headerInner}
        justify="space-between"
        wrap="nowrap"
      >
        <Group gap="lg" wrap="nowrap">
          <Box
            onClick={() => router.push('/courses')}
            style={{ cursor: 'pointer' }}
          >
            <CrispLogo />
          </Box>

          {isCourseRoute && (
            <Box className={classes.courseHeaderInfo}>
              {courseCode && (
                <Text className={classes.courseCode}>{courseCode}</Text>
              )}
              {courseMeta && (
                <Text className={classes.courseMeta}>{courseMeta}</Text>
              )}
              {breadcrumbs.length > 0 && (
                <Group gap={6} wrap="wrap" mt={4}>
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
              )}
            </Box>
          )}
        </Group>

        <ProfileDropdown />
      </Group>
    </Box>
  );
};

export default TopBar;
