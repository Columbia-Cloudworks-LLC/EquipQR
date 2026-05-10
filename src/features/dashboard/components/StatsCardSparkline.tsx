import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export interface StatsCardSparklineProps {
  data: number[];
  color: string;
  gradientId: string;
}

const StatsCardSparkline: React.FC<StatsCardSparklineProps> = ({ data, color, gradientId }) => {
  const chartData = data.map((v) => ({ v }));
  return (
    <div aria-hidden title="Recent 7-day trend" className="mt-2 h-10 w-full min-w-[4rem]">
      <ResponsiveContainer width="100%" height={40}>
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StatsCardSparkline;
