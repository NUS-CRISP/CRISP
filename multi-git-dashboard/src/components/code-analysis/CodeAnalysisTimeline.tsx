import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CodeAnalysisTimelineProps {
  codeData: {
    [executionDate: string]: {
      metrics: string[];
      values: string[];
      types: string[];
      domains: string[];
    };
  };
}

const CodeAnalysisTimeline: React.FC<CodeAnalysisTimelineProps> = ({
  codeData,
}) => {
  const domains = [
    'Complexity',
    'Duplications',
    'Maintainability',
    'Reliability',
    'Security',
    'Size',
    'Coverage',
  ];
  // Map of domain -> date -> metric -> value
  const data = new Map<string, Map<Date, Map<string, number>>>();
  for (const d of domains) {
    data.set(d, new Map<Date, Map<string, number>>());
  }

  const [domain, setDomain] = useState<string>('Complexity');

  Object.keys(codeData).map(executionDate => {
    const dataPoint = codeData[executionDate];
    const execDate = new Date(executionDate);

    for (let i = 0; i < dataPoint.metrics.length; i++) {
      const metric = dataPoint.metrics[i];
      const value = dataPoint.values[i];
      const domain = dataPoint.domains[i];

      // Ignore metrics that are not of the above domains for timeline.
      if (!data.has(domain)) continue;

      if (!data.get(domain)?.has(execDate)) {
        data.get(domain)?.set(execDate, new Map<string, number>());
      }

      data.get(domain)?.get(execDate)?.set(metric, parseFloat(value));
    }
  });

  const chartData = new Map<string, { [key: string]: number | Date }[]>();
  for (const d of domains) {
    chartData.set(d, []);
  }

  for (const [dm, dateMap] of data) {
    for (const [date, metricMap] of dateMap) {
      const datePoint: { [key: string]: number | Date } = {
        executionDate: date,
      };
      for (const [metric, value] of metricMap) {
        datePoint[metric] = value;
      }

      chartData.get(dm)?.push(datePoint);
    }
  }

  const domainData = chartData.get(domain) || [];
  const xTicks = domainData.map(item =>
    new Date(item.executionDate).toLocaleDateString()
  );

  return (
    <div>
      <label htmlFor="domain-select">Select Domain:</label>
      <select
        id="domain-select"
        onChange={e => setDomain(e.target.value)}
        value={domain}
      >
        {domains.map(domain => (
          <option key={domain} value={domain}>
            {domain}
          </option>
        ))}
      </select>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={domainData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="executionDate"
            ticks={xTicks}
            tickFormatter={date => new Date(date).toLocaleDateString()}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          {Object.keys(domainData[0] || {})
            .filter(key => key !== 'executionDate')
            .map(metric => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={`#${Math.floor(Math.random() * 16777215).toString(16)}`}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CodeAnalysisTimeline;
