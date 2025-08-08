// components/admin/WineCardsChart.js
import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function WineCardsChart({ data }) {
  // capisco se siamo in modalità oraria (hour) oppure giornaliera (date)
  const hourlyMode = data.length > 0 && data[0].hasOwnProperty('hour');

  // formatter per gli assi
  const tickFormatter = value => {
    if (hourlyMode) {
      // se è un’ora, lo mostro come “HH:00”
      return `${String(value).padStart(2, '0')}:00`;
    } else {
      // altrimenti valore è stringa "YYYY-MM-DD"
      const [year, month, day] = value.split('-').map(Number);
      return String(day);            // sull’asse solo il giorno
    }
  };

  // formatter per l’etichetta del tooltip
  const labelFormatter = value => {
    if (hourlyMode) {
      return `${String(value).padStart(2,'0')}:00`;
    } else {
      // ricavo giorno e mese
      const [year, month, day] = value.split('-').map(Number);
      const monthNames = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
      return `${day} ${monthNames[month - 1]}`;
    }
  };

  // formatter per il contenuto nel tooltip
  const tooltipFormatter = val => [val, 'Carte generate'];

  // assicuro che count sia sempre un numero
  const sanitized = data.map(d => ({
    ...d,
    count: typeof d.count === 'number' ? d.count : 0
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={sanitized}
        margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey={hourlyMode ? 'hour' : 'date'}
          tickFormatter={tickFormatter}
          tick={{
            angle: hourlyMode ? 0 : -45,
            textAnchor: hourlyMode ? 'middle' : 'end',
            fontSize: 12
          }}
          height={hourlyMode ? 30 : 50}
        />
        <YAxis
          allowDecimals={false}
          label={{ value: 'Numero carte', angle: -90, position: 'insideLeft', offset: 10 }}
        />
        <Tooltip
          formatter={tooltipFormatter}
          labelFormatter={labelFormatter}
          cursor={{ fill: 'rgba(0,0,0,0.05)' }}
        />
        <Bar
          dataKey="count"
          fill="#3F464B"
          barSize={hourlyMode ? 16 : 24}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
