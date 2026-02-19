import { Menu, Group, Avatar, Text, UnstyledButton, rem } from '@mantine/core';
import {
  IconSettings,
  IconChevronDown,
  IconLogout,
  IconBell,
  IconShield,
} from '@tabler/icons-react';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/router';
import NotificationSettingsForm from './forms/NotificationSettingsForm';
import { CRISP_ROLE } from '@shared/types/auth/CrispRole';

export function ProfileDropdown() {
  const { data: session } = useSession();
  const router = useRouter();
  const [opened, setOpened] = useState(false);
  const [notificationModalOpened, setNotificationModalOpened] = useState(false);

  return (
    <div
      style={{
        marginLeft: 'auto',
        width: 'fit-content',
        transform: 'scale(1.4)',
        transformOrigin: 'right center',
      }}
    >
      <Menu
        shadow="md"
        width={300}
        position="bottom-end"
        offset={6}
        onChange={setOpened}
      >
        <Menu.Target>
          <UnstyledButton
            style={{
              padding: '8px',
              borderRadius: 'var(--mantine-radius-md)',
              transition: 'background-color 0.2s ease',
              width: '100%',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor =
                'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Group gap="xs" wrap="nowrap" justify="space-between">
              <Group gap="xs" wrap="nowrap">
                <Avatar size={32} radius="xl" color="blue">
                  {session?.user?.name?.charAt(0).toUpperCase()}
                </Avatar>
                <Text size="sm" fw={500} truncate>
                  {session?.user?.name}
                </Text>
              </Group>
              <IconChevronDown
                style={{
                  width: rem(16),
                  height: rem(16),
                  transform: opened ? 'rotate(0deg)' : 'rotate(-90deg)',
                  transition: 'transform 200ms ease',
                }}
              />
            </Group>
          </UnstyledButton>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>
            <div>
              <Text size="xl" fw={500}>
                {session?.user?.name}
              </Text>
              <Text size="md" c="dimmed" truncate>
                {session?.user?.email}
              </Text>
            </div>
          </Menu.Label>

          {session?.user?.crispRole === CRISP_ROLE.Admin && (
            <Menu.Item
              style={{
                fontSize: '1.25rem',
              }}
              color="blue"
              leftSection={
                <IconShield style={{ width: rem(16), height: rem(16) }} />
              }
              onClick={() => router.push('/admin')}
            >
              Admin Page
            </Menu.Item>
          )}

          <Menu.Divider />

          <Menu.Item
            style={{
              fontSize: '1.25rem',
            }}
            leftSection={
              <IconSettings style={{ width: rem(16), height: rem(16) }} />
            }
            onClick={() => {
              // Navigate to account settings when implemented
              console.log('Navigate to account settings');
            }}
          >
            Account settings
          </Menu.Item>
          <Menu.Item
            style={{
              fontSize: '1.25rem',
            }}
            leftSection={
              <IconBell style={{ width: rem(16), height: rem(16) }} />
            }
            onClick={() => setNotificationModalOpened(true)}
          >
            Configure Notifications
          </Menu.Item>
          <Menu.Item
            style={{
              fontSize: '1.25rem',
            }}
            color="red"
            leftSection={
              <IconLogout style={{ width: rem(16), height: rem(16) }} />
            }
            onClick={() => signOut()}
          >
            Sign out
          </Menu.Item>
        </Menu.Dropdown>

        <NotificationSettingsForm
          opened={notificationModalOpened}
          onClose={() => setNotificationModalOpened(false)}
        />
      </Menu>
    </div>
  );
}

export default ProfileDropdown;
