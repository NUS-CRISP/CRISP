import { Center, Title } from '@mantine/core';
import { IconGitBranch } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import CrispIcon from './CrispIcon';

const CrispLogo: React.FC = () => {
  const router = useRouter();
  return (
      <Center
        onClick={() => router.push('/courses')}
        style={{
          cursor: 'pointer',
          flexDirection: 'row',
          gap: 12,
          padding: 8,
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
        <CrispIcon size={45} />
        <Title order={2}>CRISP</Title>
      </Center>
  );
};

export default CrispLogo;
