import {
  Anchor,
  Box,
  Burger,
  Button,
  Center,
  Container,
  Group,
  HoverCard,
  useMantineTheme,
  Text,
  Divider,
  SimpleGrid,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import classes from '@styles/Home.module.css';
import { IconChevronDown, IconGitBranch } from '@tabler/icons-react';
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
          <IconGitBranch size={40} className={classes.headerIcon} />
          <a href="#" className={classes.link}>
            CRISP
          </a>
        </Group>

        <Group h="100%" gap={0} visibleFrom="sm">
          <a href="http://localhost:3002/" className={classes.link}>
            Home
          </a>
          {/* <HoverCard width={600} position="bottom" radius="md" shadow="md" withinPortal>
              <HoverCard.Target>
                <a href="#" className={classes.link}>
                  <Center inline>
                    <Box component="span" mr={5}>
                      Features
                    </Box>
                    <IconChevronDown size={16} color={theme.colors.blue[6]} />
                  </Center>
                </a>
              </HoverCard.Target>

              <HoverCard.Dropdown style={{ overflow: 'hidden' }}>
                <Group justify="space-between" px="md">
                  <Text fw={500}>Features</Text>
                  <Anchor href="#" fz="xs">
                    View all
                  </Anchor>
                </Group>

                <Divider my="sm" />

                <SimpleGrid cols={2} spacing={0}>
                  hhhh
                </SimpleGrid>

                <div className={classes.dropdownFooter}>
                  <Group justify="space-between">
                    <div>
                      <Text fw={500} fz="sm">
                        Get started
                      </Text>
                      <Text size="xs" c="dimmed">
                        Their food sources have decreased, and their numbers
                      </Text>
                    </div>
                    <Button variant="default">Get started</Button>
                  </Group>
                </div>
              </HoverCard.Dropdown>
            </HoverCard> */}
          <a href="#" className={classes.link}>
            Code
          </a>
          <a href="#" className={classes.link}>
            Contributor
          </a>

        </Group>



        <Group visibleFrom="xs">
          {items}





          <Button
            key="signin"
            onClick={() => router.push('/auth/signin')}
            color={theme.colors.blue[9]}
           size={'sm'}
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
