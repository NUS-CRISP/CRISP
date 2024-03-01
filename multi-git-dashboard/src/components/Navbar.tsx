import { Center, Stack, Tooltip, UnstyledButton, rem } from '@mantine/core';
import {
  IconGitBranch,
  IconHelp,
  IconHome2,
  IconListDetails,
  IconLogout,
  IconSettings2,
  IconUserCircle
} from '@tabler/icons-react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import classes from '../styles/Navbar.module.css';

interface NavbarLinkProps {
  icon: typeof IconHome2;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?(): void;
}

function NavbarLink({ icon: Icon, label, active, disabled, onClick }: NavbarLinkProps) {
  return (
    <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
      <UnstyledButton onClick={onClick} style={disabled ? { cursor: 'default' } : undefined} className={classes.link} data-active={active || undefined}>
        <Icon style={{ width: rem(20), height: rem(20) }} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  );
}

const Navbar: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [active, setActive] = useState('Home');

  const linksData = [
    { link: '/courses', label: 'View Courses', icon: IconListDetails },
  ];
  if (session && session.user && session.user.role === 'admin') {
    linksData.push({ link: '/admin', label: 'Admin', icon: IconSettings2 });
  }
  const links = linksData.map(item => (
    <NavbarLink
      {...item}
      key={item.label}
      active={item.label === active}
      onClick={() => {
        setActive(item.label);
        router.push(item.link);
      }}
    />
  ));

  useEffect(() => {
    const path = router.pathname;
    if (path.startsWith('/courses')) {
      setActive('View Courses');
    } else if (path.startsWith('/admin')) {
      setActive('Admin');
    } else {
      setActive('Home');
    }
  }, [router.pathname]);

  return (
    <nav className={classes.navbar}>
      <Center>
        <IconGitBranch size={30} />
      </Center>

      <div className={classes.navbarMain}>
        <Stack justify='center' gap={0}>
          {links}
        </Stack>
      </div>

      <Stack justify='center' gap={0}>
        <NavbarLink
          onClick={() => { }}
          icon={IconUserCircle}
          label={`Hello, ${session && session.user ? session.user.name : 'user'}`}
          disabled
        />

        <NavbarLink
          onClick={() => window.open('https://forms.gle/41KcH8gFh3uDfzQGA', '_blank')}
          icon={IconHelp}
          label="Submit issue / feature"
        />

        <NavbarLink
          onClick={() => signOut()}
          icon={IconLogout}
          label="Sign out"
        />
      </Stack>
    </nav>
  );
};

export default Navbar;
