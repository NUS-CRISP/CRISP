import { capitalize } from '@/lib/utils';
import {
  Box, Loader,
  Text
} from '@mantine/core';
import { Profile } from '@shared/types/Profile';
import { useEffect, useState } from 'react';

export const ProfileCard: React.FC<{ gitHandle: string; }> = ({ gitHandle }) => {
  const apiUrl = `/api/user/profile?gitHandle=${gitHandle}`;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({} as Profile);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(apiUrl);
        if (!res.ok) {
          throw new Error('Failed to fetch user profile.');
        }
        const data = await res.json();
        setProfile(data as Profile);
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

  return Object.entries(profile).map(([key, value]) => <Text key={key}>{capitalize(key)}: {value}</Text>);
};
