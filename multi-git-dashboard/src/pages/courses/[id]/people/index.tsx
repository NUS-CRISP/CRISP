import PeopleInfo from '@/components/views/PeopleInfo';
import { hasFacultyPermission } from '@/lib/auth/utils';
import { Container } from '@mantine/core';
import { User } from '@shared/types/User';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const PeopleListPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query as {
    id: string;
  };

  const apiRoute = `/api/courses/${id}/people`;
  const apiRouteAccountStatus = '/api/accounts/status';

  const [faculty, setFaculty] = useState<User[]>([]);
  const [TAs, setTAs] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [accountStatusRecord, setAccountStatusRecord] = useState<
    Record<string, boolean>
  >({});

  const permission = hasFacultyPermission();

  const onUpdate = () => {
    fetchPeople();
    getAccountStatuses();
  };

  const [peopleAdded, setPeopleAdded] = useState(false);

  const handlePeopleAdded = () => {
    setPeopleAdded(true); // Enable other tabs when people are added
  };

  useEffect(() => {
    if (router.isReady) {
      fetchPeople();
    }
  }, [router.isReady]);

  useEffect(() => {
    if (permission && faculty.length > 0 && TAs.length > 0) {
      getAccountStatuses();
    }
  }, [faculty, TAs]);

  const fetchPeople = async () => {
    try {
      const response = await fetch(apiRoute, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Error fetching people:', response.statusText);
      } else {
        const data = await response.json();
        const { faculty, TAs, students } = data;
        setFaculty(faculty);
        setTAs(TAs);
        setStudents(students);
      }
    } catch (error) {
      console.error('Error fetching people:', error);
    }
  };

  const getAccountStatuses = async () => {
    try {
      const userIds: string[] = [];
      faculty.forEach(faculty => userIds.push(faculty._id));
      TAs.forEach(ta => userIds.push(ta._id));

      const idsQueryParam = userIds.join(',');

      const response = await fetch(
        `${apiRouteAccountStatus}?ids=${encodeURIComponent(idsQueryParam)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      const data = await response.json();
      setAccountStatusRecord(data);
    } catch (error) {
      console.error('Error getting account statuses:', error);
    }
  };

  return (
    <Container>
      {id && (
        <PeopleInfo
          courseId={id}
          faculty={faculty}
          TAs={TAs}
          students={students}
          hasFacultyPermission={permission}
          accountStatusRecord={accountStatusRecord}
          onUpdate={onUpdate}
          onPeopleAdded={handlePeopleAdded}
        />
      )}
    </Container>
  );
};

export default PeopleListPage;
