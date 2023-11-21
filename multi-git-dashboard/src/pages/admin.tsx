import {
  Button,
  Center,
  Checkbox,
  Group,
  ScrollArea,
  Table,
  Text,
  TextInput,
  UnstyledButton,
  rem,
} from '@mantine/core';
import { Account } from '@shared/types/Account';
import {
  IconChevronDown,
  IconChevronUp,
  IconSearch,
  IconSelector,
} from '@tabler/icons-react';
import { GetSessionParams, getSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import classes from '../styles/admin.module.css';

type RowData = Pick<Account, 'email' | 'role'>;

interface ThProps {
  children: React.ReactNode;
  reversed: boolean;
  sorted: boolean;
  onSort(): void;
}

const filterData = (data: Account[], search: string) => {
  const query = search.toLowerCase().trim();

  return data.filter(
    item =>
      item.email.toLowerCase().includes(query) ||
      item.role.toLowerCase().includes(query)
  );
};

const sortData = (
  data: Account[],
  payload: { sortBy: keyof RowData | null; reversed: boolean; search: string }
) => {
  const { reversed, search, sortBy } = payload;

  return !sortBy
    ? filterData(data, search)
    : filterData(
      [...data].sort((a, b) =>
        reversed
          ? b[sortBy].localeCompare(a[sortBy])
          : a[sortBy].localeCompare(b[sortBy])
      ),
      payload.search
    );
};

const Th: React.FC<ThProps> = ({
  children,
  reversed,
  sorted,
  onSort,
}: ThProps) => {
  const Icon = sorted
    ? reversed
      ? IconChevronUp
      : IconChevronDown
    : IconSelector;

  return (
    <Table.Th className={classes.th}>
      <UnstyledButton onClick={onSort} className={classes.control}>
        <Group justify="space-between">
          <Text fw={500} fz="sm">
            {children}
          </Text>
          <Center className={classes.icon}>
            <Icon style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
          </Center>
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
};

const AdminPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [pendingAccounts, setPendingAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [sortBy, setSortBy] = useState<keyof RowData | null>(null);
  const [reverseSortDirection, setReverseSortDirection] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const setSorting = (field: keyof RowData) => {
    let newSortBy = sortBy;
    let newReverseSortDirection = reverseSortDirection;

    if (sortBy === field) {
      if (reverseSortDirection) {
        // Disable sorting if it's currently in descending order
        newSortBy = null;
        newReverseSortDirection = false;
      } else {
        // Set to descending order
        newReverseSortDirection = true;
      }
    } else {
      // Set to ascending order on a new column
      newSortBy = field;
      newReverseSortDirection = false;
    }

    // Update the state
    setSortBy(newSortBy);
    setReverseSortDirection(newReverseSortDirection);

    // Use the new values for sorting
    setFilteredAccounts(
      sortData(pendingAccounts, {
        sortBy: newSortBy,
        reversed: newReverseSortDirection,
        search,
      })
    );
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    setSearch(value);
    setFilteredAccounts(
      sortData(pendingAccounts, {
        sortBy,
        reversed: reverseSortDirection,
        search: value,
      })
    );
  };

  const handleApprove = async (ids: string[]) => {
    // Approve account
    const response = await fetch(
      `http://localhost:${process.env.NEXT_PUBLIC_BACKEND_PORT}/api/accounts/approve`,
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
      setPendingAccounts(
        pendingAccounts.filter(account => !ids.includes(account._id))
      );
      setFilteredAccounts(
        filteredAccounts.filter(account => !ids.includes(account._id))
      );
    }
  };

  useEffect(() => {
    const fetchPendingAccounts = async () => {
      const response = await fetch(
        `http://localhost:${process.env.NEXT_PUBLIC_BACKEND_PORT}/api/accounts/pending`
      );
      const data: Account[] = await response.json();
      console.log(data);

      setPendingAccounts(data);
      setFilteredAccounts(
        sortData(data, { sortBy, reversed: reverseSortDirection, search })
      );
    };

    fetchPendingAccounts();
  }, []);

  const rows = filteredAccounts.map((account: Account) => (
    <Table.Tr
      key={account._id}
      bg={
        selectedRows.includes(account._id)
          ? 'var(--mantine-color-blue-light)'
          : undefined
      }
    >
      <Table.Td>
        <Checkbox
          aria-label="Select row"
          checked={selectedRows.includes(account._id)}
          onChange={event =>
            setSelectedRows(
              event.currentTarget.checked
                ? [...selectedRows, account._id]
                : selectedRows.filter(position => position !== account._id)
            )
          }
        />
      </Table.Td>
      <Table.Td>{account.email}</Table.Td>
      <Table.Td>{account.role}</Table.Td>
      <Table.Td>
        <Group>
          <Button onClick={() => handleApprove([account._id])}>Approve</Button>
          <Button color="red">Delete</Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <ScrollArea>
      <TextInput
        placeholder="Search by any field"
        mb="md"
        leftSection={
          <IconSearch
            style={{ width: rem(16), height: rem(16) }}
            stroke={1.5}
          />
        }
        value={search}
        onChange={handleSearchChange}
      />
      <Table
        horizontalSpacing="md"
        verticalSpacing="xs"
        miw={700}
        mb={20}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={100} />
            <Th
              sorted={sortBy === 'email'}
              reversed={reverseSortDirection}
              onSort={() => setSorting('email')}
            >
              Email
            </Th>
            <Th
              sorted={sortBy === 'role'}
              reversed={reverseSortDirection}
              onSort={() => setSorting('role')}
            >
              Role
            </Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={4}>
                <Text fw={500} ta="center">
                  No pending accounts
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
      <Group justify="flex-end">
        <Button
          onClick={() => handleApprove(selectedRows)}
          disabled={selectedRows.length === 0}
        >
          Approve selected
        </Button>
        <Button color="red" disabled={selectedRows.length === 0}>
          Delete selected
        </Button>
      </Group>
    </ScrollArea>
  );
};

export async function getServerSideProps(context: GetSessionParams) {
  const session = await getSession(context);

  if (!session || session.user.role !== 'admin') {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}

export default AdminPage;
