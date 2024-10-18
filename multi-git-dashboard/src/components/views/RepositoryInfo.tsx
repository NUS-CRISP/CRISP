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
import UpdateRepositoryForm from '../forms/UpdateRepositoryForm';

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
  const [isEditingRepository, setIsEditingRepository] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState<string | null>(
    null
  );
  const [selectedRepositoryIndex, setSelectedRepositoryIndex] = useState<
    number | null
  >(null);

  const apiRouteRepository = `/api/courses/${courseId}/repositories/`;

  const toggleAddRepository = () => setIsAddingRepository(!isAddingRepository);
  const toggleEditRepository = () =>
    setIsEditingRepository(!isEditingRepository);
  const toggleIsEditing = () => setIsEditing(!isEditing);

  const handleDeleteRepository = async (repositoryIndex: number) => {
    try {
      const response = await fetch(`${apiRouteRepository}/${repositoryIndex}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error deleting repository');
      }

      await response.json();
      onUpdate(); // Trigger an update after deletion
    } catch (error) {
      console.error('Error deleting repository:', error);
    }
  };

  const openEditModal = (repository: string, repositoryIndex: number) => {
    setSelectedRepository(repository);
    setSelectedRepositoryIndex(repositoryIndex);
    setIsEditingRepository(true); // Reuse the same modal for adding and editing
  };

  const handleUpdate = () => {
    setIsAddingRepository(false);
    setIsEditingRepository(false);
    setSelectedRepository(null);
    setSelectedRepositoryIndex(null);
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

      <Modal
        opened={isEditingRepository}
        onClose={toggleEditRepository}
        title="Edit Repository" // Update title
      >
        <UpdateRepositoryForm
          courseId={courseId}
          repository={selectedRepository}
          repositoryIndex={selectedRepositoryIndex} // Pass the index as a prop
          onRepositoryUpdated={handleUpdate}
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
            {repositories.map((repository, index) => (
              <Table.Tr key={index}>
                <Table.Td>{repository}</Table.Td>
                {isEditing && (
                  <>
                    <Table.Td>
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => openEditModal(repository, index)}
                      >
                        Edit
                      </Button>
                    </Table.Td>
                    <Table.Td>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        onClick={() => handleDeleteRepository(index)}
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
