import { HoverCard } from '@mantine/core';
import { ProfileCard } from './cards/ProfileCard';

interface GitHandleProps {
  gitHandle: string;
}

export const GitHandle: React.FC<GitHandleProps> = ({ gitHandle }) => (
  <HoverCard>
    <HoverCard.Target>
      <span>{gitHandle}</span>
    </HoverCard.Target>
    <HoverCard.Dropdown>
      <ProfileCard gitHandle={gitHandle} />
    </HoverCard.Dropdown>
  </HoverCard>
);
