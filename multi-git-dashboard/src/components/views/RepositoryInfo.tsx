import { useState } from 'react';
import {
  Button,
  Container,
  Divider,
  Group,
  Modal,
  Space,
  Table,
} from '@mantine/core';
import Role from '@shared/types/auth/Role';
import { User } from '@shared/types/User';
import RepositoryForm from '../forms/RepositoryForm';

interface RepositoryInfoProps {
  courseId: string;
  repositories: string[];
  hasFacultyPermission: boolean;
  onUpdate: () => void;
}

const RepositoryInfo: React.FC<RepositoryInfoProps> = ({
  courseId,
  repositories,
  hasFacultyPermission,
  onUpdate,
}) => {
  const [isAddingRepository, setIsAddingRepository] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isEditingRepository, setIsEditingRepository] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState<string | null>(
    null
  );

  const [isUpdatingRepository, setIsUpdatingRepository] = useState(false);

  const apiRouteRepository = `/api/courses/${courseId}/repository/`;

  const toggleAddRepository = () => setIsAddingRepository(!isAddingRepository);

  const toggleIsEditing = () => setIsEditing(!isEditing);

  const toggleUpdateRepository = () =>
    setIsUpdatingRepository(!isUpdatingRepository);

  const handleDeleteRepository = async (repository: string) => {
    try {
      const apiRoute = apiRouteRepository;

      const response = await fetch(apiRoute, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await response.json();
      onUpdate();
    } catch (error) {
      console.error('Error deleting repository:', error);
    }
  };

  const openEditModal = (repository: string) => {
    setSelectedRepository(repository);
    setIsEditingRepository(true);
  };

  const handleUpdate = () => {
    onUpdate();
  };

  const csvHeaders = ['identifier', 'name', 'gitHandle'];

  return (
    <Container>
      {hasFacultyPermission && (
        <Group my={16}>
          {isEditing ? (
            <>
              <Button onClick={toggleUpdateRepository}>
                Update Repository
              </Button>
            </>
          ) : (
            <>
              <Button onClick={toggleAddRepository}>Add Repository</Button>
            </>
          )}
          <Button onClick={toggleIsEditing}>
            {isEditing ? 'Finish Edit' : 'Edit Details'}
          </Button>
        </Group>
      )}
      <Modal
        opened={isAddingRepository}
        onClose={toggleAddRepository}
        title="Add Repository"
      >
        <RepositoryForm
          courseId={courseId}
          onRepositoryCreated={handleUpdate}
        />
      </Modal>
      <Divider label="Public GitHub Repositories" size="lg" />
      {
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ textAlign: 'left', width: '83%' }}>
                Repository
              </Table.Th>
              <Table.Th style={{ textAlign: 'left', width: '7%' }} />
              <Table.Th style={{ textAlign: 'left', width: '10%' }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {repositories &&
              repositories.length > 0 &&
              repositories.map(repository => (
                <Table.Tr key={repository}>
                  <Table.Td style={{ textAlign: 'left' }}>
                    {repository}
                  </Table.Td>
                  {isEditing && (
                    <Table.Td>
                      <Button
                        size="compact-xs"
                        variant="light"
                        onClick={() => openEditModal(repository)}
                      >
                        Edit
                      </Button>
                    </Table.Td>
                  )}
                  {isEditing && (
                    <Table.Td>
                      <Button
                        size="compact-xs"
                        variant="light"
                        color="red"
                        onClick={() => handleDeleteRepository(repository)}
                      >
                        Remove
                      </Button>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
          </Table.Tbody>
        </Table>
      }
      <Space h="md" />
    </Container>
  );
};

export default RepositoryInfo;
