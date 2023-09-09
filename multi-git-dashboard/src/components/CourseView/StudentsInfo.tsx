import React from 'react';
import { Table } from '@mantine/core';

interface User {
  _id: string;
  name: string;
  email: string;
  gitHandle: string;
}

interface StudentsInfoProps {
  students: User[];
}

const StudentsInfo: React.FC<StudentsInfoProps> = ({ students }) => {
  return (
    <Table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Git Handle</th>
        </tr>
      </thead>
      <tbody>
        {students.map((student) => (
          <tr key={student._id}>
            <td>{student.name}</td>
            <td>{student.email}</td>
            <td>{student.gitHandle}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default StudentsInfo;
