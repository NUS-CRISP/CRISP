import { capitalize } from '@/lib/utils';
import { Box, Loader, Text } from '@mantine/core';
import { Profile } from '@shared/types/Profile';
import { useEffect, useState } from 'react';
import { GitHandleProps } from '../GitHandle';

interface ProfileCardProps extends GitHandleProps {}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  gitHandle,
  profileGetter,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<Profile>({} as Profile);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setProfile(await profileGetter(gitHandle));
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) return <Loader />;
  if (error) return <Box>{error}</Box>;

  return Object.entries(profile).map(([key, value]) => (
    <Text key={key}>
      {capitalize(key)}: {value}
    </Text>
  ));
};
