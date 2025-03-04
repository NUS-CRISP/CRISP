import { useEffect, useState } from 'react';
import {
  Modal,
  Tabs,
  Button,
  Select,
  NumberInput,
  Switch,
  Text,
  Group,
  Alert,
} from '@mantine/core';
import { IconHelp } from '@tabler/icons-react';

interface NotificationSettingsFormProps {
  opened: boolean;
  onClose: () => void;
}

interface AccountData {
  email: string;
  emailNotificationType?: string;
  emailNotificationHour?: number;
  emailNotificationWeekday?: number;
  wantsEmailNotifications: boolean;

  telegramChatId?: number; // If this is missing or -1, user is not connected
  telegramNotificationType?: string;
  telegramNotificationHour?: number;
  telegramNotificationWeekday?: number;
  wantsTelegramNotifications: boolean;
}

const TELEGRAM_BOT_HANDLE =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_HANDLE || '@crisp_notif_bot';
const TELEGRAM_BOT_NAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'NUSCRISPNotifications';

const NotificationSettingsForm: React.FC<NotificationSettingsFormProps> = ({
  opened,
  onClose,
}) => {
  const [accountData, setAccountData] = useState<AccountData | null>(null);

  const [wantsEmailNotifications, setWantsEmailNotifications] = useState(false);
  const [emailNotificationType, setEmailNotificationType] = useState('daily');
  const [emailNotificationHour, setEmailNotificationHour] = useState<number>(0);
  const [emailNotificationWeekday, setEmailNotificationWeekday] =
    useState<number>(1);

  const [wantsTelegramNotifications, setWantsTelegramNotifications] =
    useState(false);
  const [telegramNotificationType, setTelegramNotificationType] =
    useState('daily');
  const [telegramNotificationHour, setTelegramNotificationHour] =
    useState<number>(0);
  const [telegramNotificationWeekday, setTelegramNotificationWeekday] =
    useState<number>(1);

  const [helpModalOpened, setHelpModalOpened] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (opened) {
      setSuccessMessage(null);
    }
  }, [opened]);

  useEffect(() => {
    if (!opened) return;

    const fetchAccount = async () => {
      try {
        const res = await fetch('/api/user/notificationSettings');
        const data: AccountData = await res.json();
        setAccountData(data);

        setWantsEmailNotifications(data.wantsEmailNotifications);
        if (data.emailNotificationType) {
          setEmailNotificationType(data.emailNotificationType);
        }
        if (data.emailNotificationHour !== undefined) {
          setEmailNotificationHour(data.emailNotificationHour);
        }
        if (data.emailNotificationWeekday !== undefined) {
          setEmailNotificationWeekday(data.emailNotificationWeekday);
        }

        setWantsTelegramNotifications(data.wantsTelegramNotifications);
        if (data.telegramNotificationType) {
          setTelegramNotificationType(data.telegramNotificationType);
        }
        if (data.telegramNotificationHour !== undefined) {
          setTelegramNotificationHour(data.telegramNotificationHour);
        }
        if (data.telegramNotificationWeekday !== undefined) {
          setTelegramNotificationWeekday(data.telegramNotificationWeekday);
        }
      } catch (error) {
        console.error('Error fetching account:', error);
      }
    };

    fetchAccount();
  }, [opened]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleTabChange = () => {
    setSuccessMessage(null);
  };

  const handleSaveEmail = async () => {
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/accounts/notifications/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wantsEmailNotifications,
          emailNotificationType,
          emailNotificationHour,
          emailNotificationWeekday,
        }),
      });
      if (!res.ok) {
        console.error('Failed to save email settings');
      } else {
        setSuccessMessage('Email settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving email settings:', error);
    }
  };

  const handleSaveTelegram = async () => {
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/accounts/notifications/telegram', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wantsTelegramNotifications,
          telegramNotificationType,
          telegramNotificationHour,
          telegramNotificationWeekday,
        }),
      });
      if (!res.ok) {
        console.error('Failed to save telegram settings');
      } else {
        setSuccessMessage('Telegram settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving telegram settings:', error);
    }
  };

  const hasTelegram =
    accountData?.telegramChatId !== undefined &&
    accountData.telegramChatId !== null &&
    accountData.telegramChatId !== -1;

  const shouldShowHour = (type: string) =>
    type === 'daily' || type === 'weekly';
  const shouldShowWeekday = (type: string) => type === 'weekly';

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title="Notification Settings"
        size="lg"
      >
        <Tabs defaultValue="email" onChange={handleTabChange}>
          <Tabs.List>
            <Tabs.Tab value="email">Email</Tabs.Tab>
            <Tabs.Tab value="telegram">Telegram</Tabs.Tab>
          </Tabs.List>

          {/* =================== EMAIL TAB =================== */}
          <Tabs.Panel value="email" pt="md">
            {accountData && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <Text>Email: {accountData.email}</Text>
                <Text size="sm" c="dimmed">
                  To change your email address, please contact the CRISP support
                  team.
                </Text>

                <Switch
                  label="Enable Email Notifications"
                  checked={wantsEmailNotifications}
                  onChange={e =>
                    setWantsEmailNotifications(e.currentTarget.checked)
                  }
                />

                <Select
                  label="Notification Type"
                  data={['hourly', 'daily', 'weekly']}
                  value={emailNotificationType}
                  onChange={val => setEmailNotificationType(val!)}
                  disabled={!wantsEmailNotifications}
                />

                {wantsEmailNotifications &&
                  shouldShowHour(emailNotificationType) && (
                    <NumberInput
                      label="Notification Hour (0 - 23 / 24H format)"
                      value={emailNotificationHour}
                      onChange={val => setEmailNotificationHour(val! as number)}
                      min={0}
                      max={23}
                    />
                  )}

                {wantsEmailNotifications &&
                  shouldShowWeekday(emailNotificationType) && (
                    <NumberInput
                      label="Notification Weekday (1 = Mon, ... 7 = Sun)"
                      value={emailNotificationWeekday}
                      onChange={val =>
                        setEmailNotificationWeekday(val! as number)
                      }
                      min={1}
                      max={7}
                    />
                  )}

                {successMessage && (
                  <Alert color="green" variant="filled" mt="xs" p="xs">
                    {successMessage}
                  </Alert>
                )}

                <Group justify="flex-end">
                  <Button onClick={handleSaveEmail}>Save Email Settings</Button>
                </Group>
              </div>
            )}
          </Tabs.Panel>

          {/* =================== TELEGRAM TAB =================== */}
          <Tabs.Panel value="telegram" pt="md">
            {accountData && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <Group justify="flex-start">
                  <Button
                    variant="outline"
                    leftSection={<IconHelp size={16} />}
                    onClick={() => setHelpModalOpened(true)}
                  >
                    Help: How to connect account to Telegram
                  </Button>
                </Group>

                {!hasTelegram ? (
                  <Text c="dimmed" size="sm">
                    You are not connected to Telegram. Use the Help button above
                    to learn how to connect Telegram to your account.
                  </Text>
                ) : (
                  <>
                    <Switch
                      label="Enable Telegram Notifications"
                      checked={wantsTelegramNotifications}
                      onChange={e =>
                        setWantsTelegramNotifications(e.currentTarget.checked)
                      }
                    />

                    <Select
                      label="Notification Type"
                      data={['hourly', 'daily', 'weekly']}
                      value={telegramNotificationType}
                      onChange={val => setTelegramNotificationType(val!)}
                      disabled={!wantsTelegramNotifications}
                    />

                    {wantsTelegramNotifications &&
                      shouldShowHour(telegramNotificationType) && (
                        <NumberInput
                          label="Notification Hour (0-23)"
                          value={telegramNotificationHour}
                          onChange={val =>
                            setTelegramNotificationHour(val! as number)
                          }
                          min={0}
                          max={23}
                        />
                      )}

                    {wantsTelegramNotifications &&
                      shouldShowWeekday(telegramNotificationType) && (
                        <NumberInput
                          label="Notification Weekday (1=Mon ... 7=Sun)"
                          value={telegramNotificationWeekday}
                          onChange={val =>
                            setTelegramNotificationWeekday(val! as number)
                          }
                          min={1}
                          max={7}
                        />
                      )}

                    {successMessage && (
                      <Alert color="green" variant="filled" mt="xs" p="xs">
                        {successMessage}
                      </Alert>
                    )}

                    <Group justify="flex-end">
                      <Button onClick={handleSaveTelegram}>
                        Save Telegram Settings
                      </Button>
                    </Group>
                  </>
                )}
              </div>
            )}
          </Tabs.Panel>
        </Tabs>
      </Modal>

      <Modal
        opened={helpModalOpened}
        onClose={() => setHelpModalOpened(false)}
        title="How to Connect Telegram"
        size="md"
      >
        <Text>
          Step 1: Open Telegram. Sign up if you have not done so. Link:
          https://web.telegram.org/
          <br />
          Step 2: Talk to {TELEGRAM_BOT_HANDLE} by searching in the search bar
          for {TELEGRAM_BOT_HANDLE}, and click on the {TELEGRAM_BOT_NAME} bot.
          <br />
          Step 3: Use the command /register 'your CRISP account email'.
          <br />
          Step 4: Refresh this page after the bot confirms your registration.
        </Text>
      </Modal>
    </>
  );
};

export default NotificationSettingsForm;
