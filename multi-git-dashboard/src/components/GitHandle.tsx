import { HoverCard } from '@mantine/core';
import { ProfileCard } from './cards/ProfileCard';
import { ProfileGetter } from './views/Overview';

export interface GitHandleProps {
  gitHandle: string;
  profileGetter: ProfileGetter;
}

export const GitHandle: React.FC<GitHandleProps> = (props: GitHandleProps) => (
  <HoverCard>
    <HoverCard.Target>
      <span>{props.gitHandle}</span>
    </HoverCard.Target>
    <HoverCard.Dropdown>
      <ProfileCard {...props} />
    </HoverCard.Dropdown>
  </HoverCard>
);
