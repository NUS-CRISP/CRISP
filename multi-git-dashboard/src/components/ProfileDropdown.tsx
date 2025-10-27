import { Menu, Group, Avatar, Text, UnstyledButton, rem } from '@mantine/core';
import { IconSettings, IconChevronDown, IconLogout } from '@tabler/icons-react';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';

export function ProfileDropdown() {
  const { data: session } = useSession();
  const [opened, setOpened] = useState(false);

  return (
    <Menu
      shadow="md"
      width={240}
      position="right-start"
      offset={8}
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
            <Text size="m" fw={500}>
              {session?.user?.name}
            </Text>
            <Text size="sm" c="dimmed" truncate>
              {session?.user?.email}
            </Text>
          </div>
        </Menu.Label>

        <Menu.Divider />

        <Menu.Item
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
          color="red"
          leftSection={
            <IconLogout style={{ width: rem(16), height: rem(16) }} />
          }
          onClick={() => signOut()}
        >
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

export default ProfileDropdown;
