import { startCase } from '@/lib/utils';
import { Loader } from '@mantine/core';
import { Profile } from '@shared/types/Profile';
import { Status } from '@shared/types/util/Status';
import { useEffect, useState } from 'react';
import { GitHandleProps } from '../GitHandle';

interface ProfileCardProps extends GitHandleProps { }

export const ProfileCard: React.FC<ProfileCardProps> = ({ gitHandle, profileGetter }) => {
  const [status, setStatus] = useState<Status>(Status.Loading);
  const [error, setError] = useState<string>('');
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileData = await profileGetter(gitHandle);
        setProfile(profileData);
        setStatus(Status.Idle);
      } catch (error) {
        if (error instanceof Error) {
          setStatus(Status.Error);
          setError(error.message);
        }
      }
    };

    fetchProfile();
  }, [gitHandle, profileGetter]);

  if (status === Status.Loading) return <Loader />;
  if (status === Status.Error) return <div>{error}</div>;

  if (!profile) return null;

  return (
    <div>
      {Object.entries(profile).map(([key, value]) => (
        <div key={key}>
          {startCase(key)}: {value}
        </div>
      ))}
    </div>
  );
};
