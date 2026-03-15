import { Anchor, Container, Group } from '@mantine/core';
import { IconGitBranch } from '@tabler/icons-react';
import classes from '@styles/Footer.module.css';
import { Text } from '@mantine/core';
import Link from 'next/link';

const Footer: React.FC = () => {
  return (
    <div className={classes.footer}>
      <Container className={classes.inner}>
        <Group>
          <IconGitBranch size={50} className={classes.headerIcon} />
          <Text className={classes.link} style={{ color: 'white' }}>
            CRISP
          </Text>
        </Group>
        <Group gap="lg">
          <Anchor component={Link} href="/user-guide" c="gray.4" size="sm">
            User Guide
          </Anchor>
          <Anchor component={Link} href="/dev-guide" c="gray.4" size="sm">
            Dev Guide
          </Anchor>
        </Group>
      </Container>
    </div>
  );
};

export default Footer;
