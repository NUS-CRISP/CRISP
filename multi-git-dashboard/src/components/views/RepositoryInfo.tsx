import { useState } from 'react';
import {
  Button,
  Container,
  Divider,
  Group,
  Modal,
  Space,
  Table,
  Text,
} from '@mantine/core';
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
  const [selectedRepository, setSelectedRepository] = useState<string | null>(
    null
  );

  const apiRouteRepository = `/api/courses/${courseId}/repositories/`;

  const toggleAddRepository = () => setIsAddingRepository(!isAddingRepository);
  const toggleIsEditing = () => setIsEditing(!isEditing);

  const handleDeleteRepository = async (repository: string) => {
    try {
      const response = await fetch(`${apiRouteRepository}${repository}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error deleting repository');
      }

      await response.json();
      onUpdate();
    } catch (error) {
      console.error('Error deleting repository:', error);
    }
  };

  const openEditModal = (repository: string) => {
    setSelectedRepository(repository);
    setIsAddingRepository(true); // Reuse the same modal for adding and editing
  };

  const handleUpdate = () => {
    setIsAddingRepository(false);
    setSelectedRepository(null);
    onUpdate();
  };

  return (
    <Container>
      {hasFacultyPermission && (
        <Group my={16}>
          <Button onClick={toggleAddRepository}>Add Repository</Button>
          <Button onClick={toggleIsEditing}>
            {isEditing ? 'Finish Edit' : 'Edit Details'}
          </Button>
        </Group>
      )}

      <Modal
        opened={isAddingRepository}
        onClose={toggleAddRepository}
        title={selectedRepository ? 'Edit Repository' : 'Add Repository'}
      >
        <RepositoryForm
          courseId={courseId}
          onRepositoryCreated={handleUpdate}
        />
      </Modal>

      <Divider label="Public GitHub Repositories" size="lg" />

      {repositories.length > 0 ? (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ textAlign: 'left', width: '83%' }}>
                Repository
              </Table.Th>
              {isEditing && (
                <>
                  <Table.Th style={{ textAlign: 'left', width: '7%' }} />
                  <Table.Th style={{ textAlign: 'left', width: '10%' }} />
                </>
              )}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {repositories.map(repository => (
              <Table.Tr key={repository}>
                <Table.Td>{repository}</Table.Td>
                {isEditing && (
                  <>
                    <Table.Td>
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => openEditModal(repository)}
                      >
                        Edit
                      </Button>
                    </Table.Td>
                    <Table.Td>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        onClick={() => handleDeleteRepository(repository)}
                      >
                        Remove
                      </Button>
                    </Table.Td>
                  </>
                )}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ) : (
        <Text>No repositories available</Text>
      )}

      <Space h="md" />
    </Container>
  );
};

export default RepositoryInfo;
