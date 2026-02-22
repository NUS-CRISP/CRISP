import { Box, Text } from '@mantine/core';
import {
  IconCalendar,
  IconFolder,
  IconSettings,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import classes from '@/styles/course-settings-navbar.module.css';

const SETTINGS_ITEMS: Array<{
  href: string;
  label: string;
  icon: typeof IconUsersGroup;
  disabled?: boolean;
}> = [
  { href: 'general', label: 'General', icon: IconSettings, disabled: true },
  { href: 'teams', label: 'Teams', icon: IconUsersGroup },
  { href: 'timeline', label: 'Timeline', icon: IconCalendar },
  { href: 'repositories', label: 'Repositories', icon: IconFolder },
  { href: 'people', label: 'People', icon: IconUsers },
];

const CourseSettingsNavbar: React.FC = () => {
  const router = useRouter();
  const { pathname, query } = router;
  const courseId = query.id as string | undefined;

  if (!courseId) return null;

  const basePath = `/courses/${courseId}`;
  const pathSegments = pathname?.replace(/\/$/, '').split('/') ?? [];
  const currentSlug = pathSegments[pathSegments.length - 1];

  return (
    <nav className={classes.settingsNavbar}>
      <Text className={classes.sectionTitle} component="div">
        Settings
      </Text>

      <Box className={classes.linksList}>
        {SETTINGS_ITEMS.map(({ href, label, icon: Icon, disabled }) => {
          const to = disabled ? '#' : `${basePath}/${href}`;
          const isActive = !disabled && currentSlug === href;

          return (
            <Link
              key={href}
              href={to}
              className={classes.navLink}
              data-active={isActive || undefined}
              data-disabled={disabled || undefined}
              aria-disabled={disabled}
            >
              <Icon className={classes.navLinkIcon} size={16} />
              <span className={classes.navLinkLabel}>{label}</span>
            </Link>
          );
        })}
      </Box>
    </nav>
  );
};

export default CourseSettingsNavbar;
