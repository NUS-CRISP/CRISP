import { Button, Checkbox, Flex, Table } from '@mantine/core';
import { User } from 'next-auth';
import { GetSessionParams, getSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

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
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  useEffect(() => {
    // Fetch accounts that are not yet approved
    const fetchPendingAccounts = async () => {
      const response = await fetch(
        `http://localhost:${process.env.NEXT_PUBLIC_BACKEND_PORT}/api/accounts/pending`
      );
      const data = await response.json();
      console.log(data);

      setPendingAccounts(data);
    };

    fetchPendingAccounts();
  }, []);

  const handleApprove = async (ids: string[]) => {
    // Approve account
    const response = await fetch(
      `http://localhost:${backendPort}/api/accounts/approve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      }
    );

    if (response.ok) {
      // Remove accounts from the list of pending accounts
      setPendingAccounts(pendingAccounts.filter((account: Account) => !ids.includes(account._id)));
    }
  };

  const rows = pendingAccounts.map((account: Account) => (
    <Table.Tr key={account._id} bg={selectedRows.includes(account._id) ? 'var(--mantine-color-blue-light)' : undefined}>
      <Table.Td>
        <Checkbox
          aria-label="Select row"
          checked={selectedRows.includes(account._id)}
          onChange={(event) =>
            setSelectedRows(
              event.currentTarget.checked
                ? [...selectedRows, account._id]
                : selectedRows.filter((position) => position !== account._id)
            )
          }
        />
      </Table.Td>
      <Table.Td>{account.email}</Table.Td>
      <Table.Td>{account.role}</Table.Td>
      <Table.Td>
        <Button onClick={() => handleApprove([account._id])}>Approve</Button>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <div>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Email</Table.Th>
            <Table.Th>Role</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
      <Flex align={'flex-end'}>
        <Button
          onClick={() => handleApprove(selectedRows)}
          disabled={selectedRows.length === 0}
        >
          Approve selected
        </Button>
      </Flex>
    </div>
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
