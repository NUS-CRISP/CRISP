import PeopleInfo from '@/components/views/PeopleInfo';
import { hasFacultyPermission } from '@/lib/auth/utils';
import { User } from '@shared/types/User';
import { useEffect, useState } from 'react';

interface PeopleInfoContainerProps {
  courseId: string;
}

const PeopleInfoContainer: React.FC<PeopleInfoContainerProps> = ({
  courseId,
}) => {
  const [faculty, setFaculty] = useState<User[]>([]);
  const [TAs, setTAs] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [accountStatusRecord, setAccountStatusRecord] = useState<
    Record<string, boolean>
  >({});

  const permission = hasFacultyPermission();

  const fetchPeople = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/people`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) return;
      const data = await response.json();
      setFaculty(data.faculty ?? []);
      setTAs(data.TAs ?? []);
      setStudents(data.students ?? []);
    } catch (error) {
      console.error('Error fetching people:', error);
    }
  };

  const getAccountStatuses = async () => {
    if (!permission) return;
    const userIds = [...faculty.map(f => f._id), ...TAs.map(t => t._id)];
    if (userIds.length === 0) return;
    try {
      const res = await fetch(
        `/api/accounts/status?ids=${encodeURIComponent(userIds.join(','))}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );
      const data = await res.json();
      setAccountStatusRecord(data ?? {});
    } catch (error) {
      console.error('Error getting account statuses:', error);
    }
  };

  useEffect(() => {
    if (courseId) fetchPeople();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    if (permission && faculty.length + TAs.length > 0) getAccountStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission, faculty, TAs]);

  const onUpdate = () => {
    fetchPeople();
    getAccountStatuses();
  };

  return (
    <PeopleInfo
      courseId={courseId}
      faculty={faculty}
      TAs={TAs}
      students={students}
      hasFacultyPermission={permission}
      accountStatusRecord={accountStatusRecord}
      onUpdate={onUpdate}
    />
  );
};

export default PeopleInfoContainer;
