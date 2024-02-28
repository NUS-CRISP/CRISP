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
import FacultyForm from '../forms/FacultyForm';
import TAForm from '../forms/TAForm';
import StudentForm from '../forms/StudentForm';
import CSVExport from '../csv/CSVExport';
import UpdateUserForm from '../forms/UpdateUserForm';
import Role from '@shared/types/auth/Role';
import { User } from '@shared/types/User';

interface PeopleInfoProps {
  courseId: string;
  faculty: User[];
  TAs: User[];
  students: User[];
  hasFacultyPermission: boolean;
  accountStatusRecord: Record<string, boolean>;
  onUpdate: () => void;
}

const PeopleInfo: React.FC<PeopleInfoProps> = ({
  courseId,
  faculty,
  TAs,
  students,
  hasFacultyPermission,
  accountStatusRecord,
  onUpdate,
}) => {
  const [isAddingFaculty, setIsAddingFaculty] = useState(false);
  const [isAddingTA, setIsAddingTA] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isExportingData, setIsExportingData] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const apiRouteFaculty = `/api/courses/${courseId}/faculty/`;
  const apiRouteTAs = `/api/courses/${courseId}/tas/`;
  const apiRouteStudents = `/api/courses/${courseId}/students/`;

  const toggleAddFaculty = () => setIsAddingFaculty(!isAddingFaculty);
  const toggleAddTA = () => setIsAddingTA(!isAddingTA);
  const toggleAddStudent = () => setIsAddingStudent(!isAddingStudent);
  const toggleIsExportingData = () => setIsExportingData(!isExportingData);

  const toggleIsEditing = () => setIsEditing(!isEditing);
  const toggleEditUser = () => setIsEditingUser(!isEditingUser);

  const handleDeleteUser = async (userId: string, role: string) => {
    try {
      let apiRoute = '';
      if (role === Role.Faculty) {
        apiRoute = `${apiRouteFaculty}${userId}`;
      } else if (role === Role.TA) {
        apiRoute = `${apiRouteTAs}${userId}`;
      } else if (role === Role.Student) {
        apiRoute = `${apiRouteStudents}${userId}`;
      } else {
        console.error('Invalid role:', role);
        return;
      }
      const response = await fetch(apiRoute, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await response.json();
      onUpdate();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setIsEditingUser(true);
  };

  const handleUpdate = () => {
    setIsAddingFaculty(false);
    setIsAddingTA(false);
    setIsAddingStudent(false);
    setIsExportingData(false);
    setIsEditingUser(false);
    setSelectedUser(null);
    onUpdate();
  };

  const facultyData = faculty.map(faculty => ({
    identifier: faculty.identifier,
    name: faculty.name,
    gitHandle: faculty.gitHandle,
  }));

  const taData = TAs.map(ta => ({
    identifier: ta.identifier,
    name: ta.name,
    gitHandle: ta.gitHandle,
  }));

  const studentData = students.map(student => ({
    identifier: student.identifier,
    name: student.name,
    gitHandle: student.gitHandle,
  }));

  const csvHeaders = ['identifier', 'name', 'gitHandle'];

  return (
    <Container>
      {hasFacultyPermission && (
        <Group my={16}>
          <Button onClick={toggleAddFaculty}>Add Faculty</Button>
          <Button onClick={toggleAddTA}>Add TA</Button>
          <Button onClick={toggleAddStudent}>Add Student</Button>
          <Button onClick={toggleIsExportingData}>Export Data</Button>
          <Button onClick={toggleIsEditing}>
            {isEditing ? 'Finish Edit' : 'Edit Details'}
          </Button>
        </Group>
      )}
      <Modal
        opened={isAddingFaculty}
        onClose={toggleAddFaculty}
        title="Add Faculty"
      >
        <FacultyForm courseId={courseId} onFacultyCreated={handleUpdate} />
      </Modal>
      <Modal opened={isAddingTA} onClose={toggleAddTA} title="Add TA">
        <TAForm courseId={courseId} onTACreated={handleUpdate} />
      </Modal>
      <Modal
        opened={isAddingStudent}
        onClose={toggleAddStudent}
        title="Add Student"
      >
        <StudentForm courseId={courseId} onStudentCreated={handleUpdate} />
      </Modal>
      <Modal
        opened={isExportingData}
        onClose={toggleIsExportingData}
        title="Export Data"
      >
        <Group my={16}>
          <CSVExport
            data={facultyData}
            headers={csvHeaders}
            label="Export Faculty"
            filename="faculty.csv"
          />
          <CSVExport
            data={taData}
            headers={csvHeaders}
            label="Export TAs"
            filename="tas.csv"
          />
          <CSVExport
            data={studentData}
            headers={csvHeaders}
            label="Export Students"
            filename="students.csv"
          />
        </Group>
      </Modal>
      <Modal opened={isEditingUser} onClose={toggleEditUser} title="Edit User">
        <UpdateUserForm user={selectedUser} onUserUpdated={handleUpdate} />
      </Modal>
      <Divider label="Faculty Members" size="lg" />
      {faculty && faculty.length > 0 && (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ textAlign: 'left', width: '43%' }}>
                Name
              </Table.Th>
              <Table.Th style={{ textAlign: 'left', width: '20%' }}>
                ID
              </Table.Th>
              <Table.Th style={{ textAlign: 'left', width: '20%' }}>
                Git Handle
              </Table.Th>
              <Table.Th style={{ textAlign: 'left', width: '7%' }} />
              <Table.Th style={{ textAlign: 'left', width: '10%' }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {faculty.map(facultyMember => (
              <Table.Tr key={facultyMember._id}>
                <Table.Td style={{ textAlign: 'left' }}>
                  {facultyMember.name}
                  {hasFacultyPermission &&
                    accountStatusRecord[facultyMember._id] === false &&
                    '*'}
                </Table.Td>
                <Table.Td style={{ textAlign: 'left' }}>
                  {facultyMember.identifier}
                </Table.Td>
                <Table.Td style={{ textAlign: 'left' }}>
                  {facultyMember.gitHandle}
                </Table.Td>
                {isEditing && (
                  <Table.Td>
                    <Button
                      size="compact-xs"
                      variant="light"
                      onClick={() => openEditModal(facultyMember)}
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
                      onClick={() =>
                        handleDeleteUser(facultyMember._id, Role.Faculty)
                      }
                    >
                      Remove
                    </Button>
                  </Table.Td>
                )}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
      <Space h="md" />
      <Divider label="Teaching Assistants" size="lg" />
      {TAs && TAs.length > 0 && (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ textAlign: 'left', width: '43%' }}>
                Name
              </Table.Th>
              <Table.Th style={{ textAlign: 'left', width: '20%' }}>
                ID
              </Table.Th>
              <Table.Th style={{ textAlign: 'left', width: '20%' }}>
                Git Handle
              </Table.Th>
              <Table.Th style={{ textAlign: 'left', width: '7%' }} />
              <Table.Th style={{ textAlign: 'left', width: '10%' }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {TAs.map(TA => (
              <Table.Tr key={TA._id}>
                <Table.Td style={{ textAlign: 'left' }}>
                  {TA.name}
                  {hasFacultyPermission &&
                    accountStatusRecord[TA._id] === false &&
                    '*'}
                </Table.Td>
                <Table.Td style={{ textAlign: 'left' }}>
                  {TA.identifier}
                </Table.Td>
                <Table.Td style={{ textAlign: 'left' }}>
                  {TA.gitHandle}
                </Table.Td>
                {isEditing && (
                  <Table.Td>
                    <Button
                      size="compact-xs"
                      variant="light"
                      onClick={() => openEditModal(TA)}
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
                      onClick={() => handleDeleteUser(TA._id, Role.TA)}
                    >
                      Remove
                    </Button>
                  </Table.Td>
                )}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
      <Space h="md" />
      <Divider label="Students" size="lg" />
      {students && students.length > 0 && (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ textAlign: 'left', width: '43%' }}>
                Name
              </Table.Th>
              <Table.Th style={{ textAlign: 'left', width: '20%' }}>
                ID
              </Table.Th>
              <Table.Th style={{ textAlign: 'left', width: '20%' }}>
                Git Handle
              </Table.Th>
              <Table.Th style={{ textAlign: 'left', width: '7%' }} />
              <Table.Th style={{ textAlign: 'left', width: '10%' }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {students.map(student => (
              <Table.Tr key={student._id}>
                <Table.Td style={{ textAlign: 'left' }}>
                  {student.name}
                </Table.Td>
                <Table.Td style={{ textAlign: 'left' }}>
                  {student.identifier}
                </Table.Td>
                <Table.Td style={{ textAlign: 'left' }}>
                  {student.gitHandle}
                </Table.Td>
                {isEditing && (
                  <Table.Td>
                    <Button
                      size="compact-xs"
                      variant="light"
                      onClick={() => openEditModal(student)}
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
                      onClick={() =>
                        handleDeleteUser(student._id, Role.Student)
                      }
                    >
                      Remove
                    </Button>
                  </Table.Td>
                )}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Container>
  );
};

export default PeopleInfo;
