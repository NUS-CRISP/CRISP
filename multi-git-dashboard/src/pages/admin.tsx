import { useEffect, useState } from 'react';
import { Button, Table } from '@mantine/core';
import { GetSessionParams, getSession } from 'next-auth/react';
import { User } from 'next-auth';

const backendPort = process.env.BACKEND_PORT || 3001;

interface Account {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface CustomUser extends User {
  role: string;
}

const AdminPage: React.FC = () => {
  const [pendingAccounts, setPendingAccounts] = useState([]);

  useEffect(() => {
    // Fetch accounts that are not yet approved
    const fetchPendingAccounts = async () => {
      const response = await fetch(
        `http://localhost:${backendPort}/api/accounts/pending`
      );
      const data = await response.json();
      console.log(data);

      setPendingAccounts(data);
    };

    fetchPendingAccounts();
  }, []);

  const handleApprove = async (id: string) => {
    // Approve account
    const response = await fetch(
      `http://localhost:${backendPort}/api/accounts/${id}/approve`,
      {
        method: 'POST',
      }
    );

    if (response.ok) {
      // Remove account from the list of pending accounts
      setPendingAccounts(
        pendingAccounts.filter((account: Account) => account._id !== id)
      );
    }
  };

  const rows = pendingAccounts.map((account: Account) => (
    <Table.Tr key={account._id}>
      <Table.Td>{account.name}</Table.Td>
      <Table.Td>{account.email}</Table.Td>
      <Table.Td>{account.role}</Table.Td>
      <Table.Td>
        <Button onClick={() => handleApprove(account._id)}>Approve</Button>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Table>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
};

export async function getServerSideProps(context: GetSessionParams) {
  const session = await getSession(context);

  if (!session || (session.user as CustomUser).role !== 'admin') {
    return {
      redirect: {
        destination: '/auth/signin', // redirect to signin page or another appropriate page
        permanent: false,
      },
    };
  }

  return {
    props: {}, // will be passed to the page component as props
  };
}

export default AdminPage;
