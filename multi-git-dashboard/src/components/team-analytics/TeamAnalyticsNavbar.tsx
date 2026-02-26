import { TeamData } from '@shared/types/TeamData';
import { Box, Center, Loader, Text } from '@mantine/core';
import { IconMapPin } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import classes from '@/styles/team-analytics-navbar.module.css';

const TeamAnalyticsNavbar: React.FC = () => {
  const router = useRouter();
  const { pathname, query } = router;
  const courseId = query.id as string | undefined;
  const teamNameParam = query.teamName as string | undefined;
  const currentTeamName = teamNameParam
    ? decodeURIComponent(teamNameParam)
    : null;

  const isTeamAnalyticsRoute =
    pathname?.includes('team-analytics') && !!courseId;

  const [teamDatas, setTeamDatas] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isTeamAnalyticsRoute || !courseId) return;

    let cancelled = false;
    setLoading(true);

    fetch(`/api/github/course/${courseId}`)
      .then(r => (r.ok ? r.json() : []))
      .then((data: TeamData[]) => {
        if (!cancelled) {
          setTeamDatas(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, isTeamAnalyticsRoute]);

  if (!isTeamAnalyticsRoute) {
    return null;
  }

  const uniqueTeamDatas = teamDatas.filter(
    (t, i, arr) => arr.findIndex(x => x.repoName === t.repoName) === i
  );

  return (
    <nav className={classes.teamAnalyticsNavbar}>
      <Text className={classes.teamsHeader} component="div">
        TEAMS ({uniqueTeamDatas.length})
      </Text>

      <Box className={classes.teamsList}>
        {loading ? (
          <Center py="md">
            <Loader size="sm" />
          </Center>
        ) : (
          uniqueTeamDatas.map(team => {
            const href = `/courses/${courseId}/team-analytics/${encodeURIComponent(team.repoName)}`;
            const isActive = currentTeamName === team.repoName;

            return (
              <Link
                key={team._id}
                href={href}
                className={classes.teamLink}
                data-active={isActive || undefined}
              >
                <IconMapPin className={classes.teamLinkIcon} size={16} />
                <span className={classes.teamLinkLabel}>{team.repoName}</span>
              </Link>
            );
          })
        )}
      </Box>
    </nav>
  );
};

export default TeamAnalyticsNavbar;
