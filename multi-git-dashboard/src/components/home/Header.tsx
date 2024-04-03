import {
  Burger,
  Button,
  Container,
  Group,
  useMantineTheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import classes from '@styles/Home.module.css';
import { IconGitBranch } from '@tabler/icons-react';
import { useRouter } from 'next/router';

const Header: React.FC = () => {
  const [opened, { toggle }] = useDisclosure(false);
  const router = useRouter();
  const theme = useMantineTheme();

  const links: { link: string; label: string }[] = [];
  const items = links.map(link => (
    <Button
      key={link.link}
      onClick={() => router.push(link.link)}
      color={theme.colors.blue[4]}
      variant="subtle"
    >
      {link.label}
    </Button>
  ));

  return (
    <header className={classes.header}>
      <Container size="lg" className={classes.headerInner}>
        <Group>
          <IconGitBranch size={28} className={classes.headerIcon} />
          CRISP
        </Group>
        <Group visibleFrom="xs">
          {items}
          <Button
            key="signin"
            onClick={() => router.push('/auth/signin')}
            color={theme.colors.blue[9]}
            autoContrast
          >
            Sign in
          </Button>
        </Group>

        <Burger opened={opened} onClick={toggle} hiddenFrom="xs" size="sm" />
      </Container>
    </header>
  );
};

export default Header;
