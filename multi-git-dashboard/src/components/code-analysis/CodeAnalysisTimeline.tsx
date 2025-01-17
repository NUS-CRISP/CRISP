import { metricExplanations } from '@/lib/utils';
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
  TooltipProps,
} from 'recharts';
import styles from '../../styles/CodeAnalysisTimeline.module.css';

interface CodeAnalysisTimelineProps {
  codeData: {
    [executionDate: string]: {
      metrics: string[];
      values: string[];
      types: string[];
      domains: string[];
      metricStats: Map<string, { median: number; mean: number }>;
    };
  };
}

const CustomToolTip: React.FC<TooltipProps<number, string>> = ({
  active,
  payload,
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className={styles['tooltip-container']}>
        <p className={styles['tooltip-date']}>
          <strong>{`Execution date & time: ${new Date(data.executionDate).toLocaleString()}`}</strong>
        </p>

        {Object.keys(data).map(key => {
          if (key === 'executionDate') return null; // Skip executionDate here
          return (
            <div className={styles['tooltip-metric']} key={key}>
              <p className={styles['tooltip-metric-title']}>
                <strong>{key}</strong>
              </p>
              <p className={styles['tooltip-metric-value']}>
                <strong
                  style={{ color: 'white' }}
                >{`Value: ${data[key].value}`}</strong>
              </p>
              <p className={styles['tooltip-metric-value']}>
                {`Median: ${
                  data[key].median === -1 ? 'Not available' : data[key].median
                }`}
              </p>
              <p className={styles['tooltip-metric-value']}>
                {`Mean: ${
                  data[key].mean === -1 ? 'Not available' : data[key].mean
                }`}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
};

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
  const data = new Map<
    string,
    Map<Date, Map<string, { value: number; mean?: number; median?: number }>>
  >();
  for (const d of domains) {
    data.set(
      d,
      new Map<
        Date,
        Map<string, { value: number; mean?: number; median?: number }>
      >()
    );
  }

  const [domain, setDomain] = useState<string>('Complexity');
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  Object.keys(codeData).map(executionDate => {
    const dataPoint = codeData[executionDate];
    const execDate = new Date(executionDate);

    for (let i = 0; i < dataPoint.metrics.length; i++) {
      const metric = dataPoint.metrics[i];
      const value = dataPoint.values[i];
      const domain = dataPoint.domains[i];
      const metricStatsMap = new Map(Object.entries(dataPoint.metricStats));

      // Ignore metrics that are not of the above domains for timeline.
      if (!data.has(domain)) continue;

      if (!data.get(domain)?.has(execDate)) {
        data
          .get(domain)
          ?.set(
            execDate,
            new Map<string, { value: number; mean?: number; median?: number }>()
          );
      }

      data
        .get(domain)
        ?.get(execDate)
        ?.set(metric, {
          value: parseFloat(value),
          mean: metricStatsMap.get(metric)?.mean || -1,
          median: metricStatsMap.get(metric)?.median || -1,
        });
    }
  });

  const chartData = new Map<
    string,
    {
      [key: string]: { value: number; mean?: number; median?: number } | Date;
    }[]
  >();
  for (const d of domains) {
    chartData.set(d, []);
  }

  for (const [dm, dateMap] of data) {
    for (const [date, metricMap] of dateMap) {
      const datePoint: {
        [key: string]: { value: number; mean?: number; median?: number } | Date;
      } = {
        executionDate: date,
      };
      for (const [metric, value] of metricMap) {
        datePoint[metric] = value;
      }

      chartData.get(dm)?.push(datePoint);
    }
  }

  const domainData = chartData.get(domain) || [];
  const xTicks = domainData.map(item => {
    const executionDate = item.executionDate as Date;
    return executionDate.toLocaleDateString();
  });

  const handleMouseEnterMetric = (metric: string) => {
    setHoveredMetric(metric);
  };

  const handleMouseLeaveMetric = () => {
    setHoveredMetric(null);
  };

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
          <Tooltip content={<CustomToolTip />} />
          <Legend
            onMouseEnter={({ value }) => handleMouseEnterMetric(value)}
            onMouseLeave={handleMouseLeaveMetric}
          />
          {Object.keys(domainData[0] || {})
            .filter(key => key !== 'executionDate')
            .map(metric => (
              <Line
                key={metric}
                type="monotone"
                dataKey={`${metric}.value`}
                name={metric}
                stroke={`#${Math.floor(Math.random() * 16777215).toString(16)}`}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>

      {hoveredMetric && metricExplanations[hoveredMetric] && (
        <div className={styles['hovered-metric-explanation']}>
          <strong>{hoveredMetric}</strong>: {metricExplanations[hoveredMetric]}
        </div>
      )}
    </div>
  );
};

export default CodeAnalysisTimeline;
