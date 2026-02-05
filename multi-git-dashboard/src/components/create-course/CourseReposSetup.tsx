import {
  ActionIcon,
  Box,
  Button,
  Card,
  Collapse,
  Group,
  SegmentedControl,
  Space,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { CreateCourseFormValues } from '@/components/create-course/types';
import { CourseType } from '@shared/types/Course';
import {
  IconBrandGithub,
  IconCheck,
  IconHelpCircle,
} from '@tabler/icons-react';

const CARD_W = '210px';
const gitHubNewInstallationUrl =
  'https://github.com/apps/NUS-CRISP/installations/new';

export type ReposInstallationStatus = 'idle' | 'loading' | 'success' | 'error';

interface Props {
  form: UseFormReturnType<CreateCourseFormValues>;
  appInstallationStatus: ReposInstallationStatus;
  errorMessage: string;
  onOrgNameChange: (value: string) => void;
  onVerifyClick: () => void;
}

export const CourseReposSetup = ({
  form,
  appInstallationStatus,
  errorMessage,
  onOrgNameChange,
  onVerifyClick,
}: Props) => {
  return (
    <>
      <Title order={4} mt="md" mb="xs">
        Repositories
      </Title>
      <Text size="sm" c="dimmed" mb="md">
        Choose how course repositories are synced.
      </Text>
      <Box>
        <Group gap={6}>
          <Title order={6} my={5}>
            Repository Source
          </Title>
          <Tooltip
            label="Choose how course repositories are synced: Manual Setup via public GitHub links, or automatically through GitHub Organisation."
            withinPortal
            multiline
            w={300}
          >
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label="Setup Repositories help"
            >
              <IconHelpCircle size={16} />
            </ActionIcon>
          </Tooltip>
          <SegmentedControl
            data={[
              {
                value: CourseType.GitHubOrg,
                label: 'GitHub Organisation',
              },
              { value: CourseType.Normal, label: 'Manual Setup' },
            ]}
            {...form.getInputProps('courseType')}
          />
        </Group>
        <Collapse in={form.values.courseType === CourseType.GitHubOrg}>
          <Box>
            <Title order={6} my={10}>
              GitHub Organisation Setup
            </Title>
            <Card withBorder p="md">
              <Text size="sm" c="dimmed" maw={520} mb="sm">
                Install the CRISP GitHub App in your GitHub organisation to
                enable automatic syncing of repositories.
              </Text>
              <Button
                w={CARD_W}
                leftSection={<IconBrandGithub size={14} />}
                variant="default"
                component="a"
                href={gitHubNewInstallationUrl}
                target="_blank"
              >
                Install CRISP GitHub
              </Button>
              <TextInput
                withAsterisk
                placeholder="e.g. nus-crisp"
                label="GitHub Organisation Name"
                {...form.getInputProps('gitHubOrgName')}
                my={5}
                onChange={e => onOrgNameChange(e.currentTarget.value)}
              />
              <Space h="sm" />
              {errorMessage && (
                <Text style={{ maxWidth: CARD_W }} c="red">
                  {errorMessage}
                </Text>
              )}
              <Button
                type="button"
                loading={appInstallationStatus === 'loading'}
                variant={
                  appInstallationStatus === 'success' ? 'filled' : 'outline'
                }
                color={
                  appInstallationStatus === 'success'
                    ? 'green'
                    : appInstallationStatus === 'error'
                      ? 'red'
                      : 'blue'
                }
                rightSection={
                  appInstallationStatus === 'success' ? (
                    <IconCheck size={14} />
                  ) : null
                }
                onClick={onVerifyClick}
              >
                {appInstallationStatus === 'error'
                  ? 'Try Again'
                  : 'Verify CRISP Installation'}
              </Button>
              <Collapse in={appInstallationStatus === 'success'} mt="md">
                <TextInput
                  withAsterisk
                  label="Repo Name Filter"
                  placeholder="e.g. 23s2"
                  {...form.getInputProps('repoNameFilter')}
                  onChange={e =>
                    form.setFieldValue('repoNameFilter', e.currentTarget.value)
                  }
                />
              </Collapse>
            </Card>
          </Box>
        </Collapse>
      </Box>
    </>
  );
};
