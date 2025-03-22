import {
  IconBrandInstagram,
  IconBrandTwitter,
  IconBrandYoutube,
} from '@tabler/icons-react';
import { ActionIcon, Container, Group } from '@mantine/core';
import { IconChevronDown, IconGitBranch } from '@tabler/icons-react';
import classes from '@styles/Footer.module.css';
import { Text } from '@mantine/core';

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
      </Container>
    </div>
  );
};

export default Footer;
