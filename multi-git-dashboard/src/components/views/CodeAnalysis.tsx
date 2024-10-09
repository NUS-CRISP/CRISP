import { Center } from '@mantine/core';
import { CodeAnalysisData } from '@shared/types/CodeAnalysisData';
import { Status } from '@shared/types/util/Status';
import { useEffect, useState } from 'react';

interface CodeAnalysisProps {
    courseId: string;
}

const CodeAnalysis: React.FC<CodeAnalysisProps> = ({ courseId }) => {
    const [codeAnalysisData, setCodeAnalysisData] = useState<CodeAnalysisData[]>([]);
    const [status, setStatus] = useState<Status>(Status.Loading);

    const getCodeAnalysisData = async () => {
        const res = await fetch(`/api/codeanalysis/course/${courseId}`);
        if (!res.ok) throw new Error('Failed to fetch code analysis data');
        const codeAnalysisData: CodeAnalysisData[] = await res.json();
        return codeAnalysisData;
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const codeAnalysisData = await getCodeAnalysisData();
                setCodeAnalysisData(codeAnalysisData);
                setStatus(Status.Idle);
            } catch (error) {
                setStatus(Status.Error);
                console.error(error);
            }
        };

        fetchData();
    }, [courseId]);

    if (status === Status.Error) return <Center>No data</Center>;

    return (
        <div>
            {codeAnalysisData.map((data) => (
                <div key={data._id}>
                    <h2>{data.repoName}</h2>
                    <p>{data.executionTime.toString()}</p>
                    <p>{data.values}</p>
                </div>
            ))}
        </div>
    );
};

export default CodeAnalysis;
