import { Course } from '@shared/types/Course';
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
import { hasFacultyPermission } from '@/lib/auth/utils';
import FacultyForm from '../forms/FacultyForm';
import TAForm from '../forms/TAForm';
import StudentForm from '../forms/StudentForm';
import CSVExport from '../csv/CSVExport';
import UpdateUserForm from '../forms/UpdateUserForm';

interface PeopleInfoProps {
  course: Course;
  onUpdate: () => void;
}

const PeopleInfo: React.FC<PeopleInfoProps> = ({ course, onUpdate }) => {
  const [isAddingFaculty, setIsAddingFaculty] = useState(false);
  const [isAddingTA, setIsAddingTA] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isExportingData, setIsExportingData] = useState(false);

  const [isEditingUser, setIsEditingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');

  const toggleAddFaculty = () => setIsAddingFaculty(!isAddingFaculty);
  const toggleAddTA = () => setIsAddingTA(!isAddingTA);
  const toggleAddStudent = () => setIsAddingStudent(!isAddingStudent);
  const toggleIsExportingData = () => setIsExportingData(!isExportingData);
  const toggleEditUser = () => setIsEditingUser(!isEditingUser);

  const openEditModal = (user: string) => {
    setSelectedUser(user);
    setIsEditingUser(true);
  };

  const handleUpdate = () => {
    setIsAddingFaculty(false);
    setIsAddingTA(false);
    setIsAddingStudent(false);
    setIsExportingData(false);
    setIsEditingUser(false);
    setSelectedUser('');
    onUpdate();
  };

  const facultyData = course.faculty.map(faculty => ({
    identifier: faculty.identifier,
    name: faculty.name,
    gitHandle: faculty.gitHandle,
  }));

  const taData = course.TAs.map(ta => ({
    identifier: ta.identifier,
    name: ta.name,
    gitHandle: ta.gitHandle,
  }));

  const studentData = course.students.map(student => ({
    identifier: student.identifier,
    name: student.name,
    gitHandle: student.gitHandle,
  }));

  const csvHeaders = ['identifier', 'name', 'gitHandle'];

  return (
    <Container>
      {hasFacultyPermission() && (
        <Group style={{ marginBottom: '16px', marginTop: '16px' }}>
          <Button onClick={toggleAddFaculty}>Add Faculty</Button>
          <Button onClick={toggleAddTA}>Add Teaching Assistant</Button>
          <Button onClick={toggleAddStudent}>Add Student</Button>
          <Button onClick={toggleIsExportingData}>Export Data</Button>
        </Group>
      )}
      <Modal
        opened={isAddingFaculty}
        onClose={toggleAddFaculty}
        title="Add Faculty"
      >
        <FacultyForm courseId={course._id} onFacultyCreated={handleUpdate} />
      </Modal>
      <Modal opened={isAddingTA} onClose={toggleAddTA} title="Add TA">
        <TAForm courseId={course._id} onTACreated={handleUpdate} />
      </Modal>
      <Modal
        opened={isAddingStudent}
        onClose={toggleAddStudent}
        title="Add Student"
      >
        <StudentForm courseId={course._id} onStudentCreated={handleUpdate} />
      </Modal>
      <Modal
        opened={isExportingData}
        onClose={toggleIsExportingData}
        title="Export Data"
      >
        <Group style={{ marginBottom: '16px', marginTop: '16px' }}>
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
        <UpdateUserForm userId={selectedUser} onUserUpdated={handleUpdate} />
      </Modal>
      <Divider label="Faculty Members" size="lg" />
      {course.faculty && course.faculty.length > 0 && (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ textAlign: 'left', width: '50%' }}>
                Name
              </Table.Th>
              <Table.Th style={{ textAlign: 'left', width: '25%' }}>
                ID
              </Table.Th>
              <Table.Th style={{ textAlign: 'left', width: '25%' }}>
                Git Handle
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {course.faculty.map(facultyMember => (
              <Table.Tr key={facultyMember._id}>
                <Table.Td style={{ textAlign: 'left' }}>
                  {facultyMember.name}
                </Table.Td>
                <Table.Td style={{ textAlign: 'left' }}>
                  {facultyMember.identifier}
                </Table.Td>
                <Table.Td style={{ textAlign: 'left' }}>
                  {facultyMember.gitHandle}
                </Table.Td>
                <Table.Td>
                  <Button onClick={() => openEditModal(facultyMember._id)}>
                    Edit Details
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
      <Space h="md" />
      <Divider label="Teaching Assistants" size="lg" />
      {course.TAs && course.TAs.length > 0 && (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ textAlign: 'left', width: '50%' }}>
                Name
              </Table.Th>
              <Table.Th style={{ textAlign: 'left', width: '25%' }}>
                ID
              </Table.Th>
              <Table.Th style={{ textAlign: 'left', width: '25%' }}>
                Git Handle
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {course.TAs.map(TA => (
              <Table.Tr key={TA._id}>
                <Table.Td style={{ textAlign: 'left' }}>{TA.name}</Table.Td>
                <Table.Td style={{ textAlign: 'left' }}>
                  {TA.identifier}
                </Table.Td>
                <Table.Td style={{ textAlign: 'left' }}>
                  {TA.gitHandle}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
      <Space h="md" />
      <Divider label="Students" size="lg" />
      {course.students && course.students.length > 0 && (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ textAlign: 'left', width: '50%' }}>
                Name
              </Table.Th>
              <Table.Th style={{ textAlign: 'left', width: '25%' }}>
                ID
              </Table.Th>
              <Table.Th style={{ textAlign: 'left', width: '25%' }}>
                Git Handle
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {course.students.map(student => (
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
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Container>
  );
};

export default PeopleInfo;
