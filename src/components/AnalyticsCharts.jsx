import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { calculateROI } from '../utils/calculations'
import { formatCompactCurrency, formatCurrency } from '../utils/formatters'
import { getWinProbabilityRatio } from '../utils/portfolio'

const COLORS = {
  blue: '#0056B3',
  green: '#6FBF7F',
  pink: '#D95C7A',
  gray: '#8C8C8C',
  light: '#F3F1EC',
}

function TooltipCard({ active, payload, label, valueFormatter = formatCurrency }) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((entry) => (
        <p key={entry.name}>
          <span style={{ color: entry.color }}>●</span> {entry.name}: {valueFormatter(entry.value)}
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsCharts({ clients }) {
  if (clients.length === 0) {
    return null
  }

  const liveClients = clients.filter((client) => client.pipelineStatus === 'Closed')
  const pipelineClients = clients.filter((client) => client.pipelineStatus !== 'Closed')

  const liveRevenueData = [...liveClients]
    .map((client) => {
      const roi = calculateROI(client)
      return {
        name: client.retailerName,
        Revenue: Math.round(roi.huel.year1GrossRevenue),
        EBITDA: Math.round(roi.huel.year1Ebitda),
      }
    })
    .sort((left, right) => right.Revenue - left.Revenue)
    .slice(0, 8)

  const tradeSummary = [
    {
      name: 'Slotting',
      value: liveClients.reduce((sum, client) => sum + calculateROI(client).huel.tradeBreakdown.slottingFixed, 0),
      color: COLORS.blue,
    },
    {
      name: 'Free Fill',
      value: liveClients.reduce((sum, client) => sum + calculateROI(client).huel.tradeBreakdown.freeFill, 0),
      color: COLORS.green,
    },
    {
      name: 'TPRs',
      value: liveClients.reduce((sum, client) => sum + calculateROI(client).huel.tradeBreakdown.tprs, 0),
      color: COLORS.pink,
    },
    {
      name: 'Marketing',
      value: liveClients.reduce((sum, client) => sum + calculateROI(client).huel.tradeBreakdown.marketing, 0),
      color: COLORS.gray,
    },
  ].filter((entry) => entry.value > 0)

  const typeMix = Array.from(new Set(liveClients.map((client) => client.clientType)))
    .map((type) => ({
      name: type,
      value: liveClients
        .filter((client) => client.clientType === type)
        .reduce((sum, client) => sum + calculateROI(client).huel.year1GrossRevenue, 0),
    }))
    .filter((entry) => entry.value > 0)

  const pipelineQuarterData = ['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => ({
    quarter,
    'Weighted Revenue': pipelineClients
      .filter((client) => (client.forecastQuarter || 'Q4') === quarter)
      .reduce((sum, client) => sum + (calculateROI(client).huel.year1GrossRevenue * getWinProbabilityRatio(client)), 0),
  }))

  return (
    <section className="view-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Portfolio analytics</p>
          <h2>Visual checks on live economics and weighted upside</h2>
        </div>
      </div>

      <div className="chart-grid">
        <article className="glass-card">
          <h3>Top live revenue vs EBITDA</h3>
          {liveRevenueData.length === 0 ? (
            <p className="empty-copy">No live revenue data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={liveRevenueData}>
                <CartesianGrid stroke={COLORS.light} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: COLORS.gray, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCompactCurrency} tick={{ fill: COLORS.gray, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipCard />} />
                <Bar dataKey="Revenue" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                <Bar dataKey="EBITDA" fill={COLORS.green} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </article>

        <article className="glass-card">
          <h3>Trade spend mix</h3>
          {tradeSummary.length === 0 ? (
            <p className="empty-copy">No trade spend recorded in the current view.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={tradeSummary}
                  dataKey="value"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={2}
                >
                  {tradeSummary.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipCard valueFormatter={formatCurrency} />} />
              </PieChart>
            </ResponsiveContainer>
          )}

          <div className="legend-list">
            {tradeSummary.map((entry) => (
              <div key={entry.name} className="legend-list__item">
                <span><i style={{ backgroundColor: entry.color }} /> {entry.name}</span>
                <strong>{formatCurrency(entry.value)}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card">
          <h3>Live revenue share by client type</h3>
          {typeMix.length === 0 ? (
            <p className="empty-copy">No live revenue mix to show.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={typeMix} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid stroke={COLORS.light} horizontal={false} />
                <XAxis type="number" tickFormatter={formatCompactCurrency} tick={{ fill: COLORS.gray, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: COLORS.gray, fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                <Tooltip content={<TooltipCard />} />
                <Bar dataKey="value" fill={COLORS.pink} radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </article>

        <article className="glass-card">
          <h3>Weighted pipeline revenue by quarter</h3>
          {pipelineClients.length === 0 ? (
            <p className="empty-copy">No pipeline revenue in the current view.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={pipelineQuarterData}>
                <CartesianGrid stroke={COLORS.light} vertical={false} />
                <XAxis dataKey="quarter" tick={{ fill: COLORS.gray, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCompactCurrency} tick={{ fill: COLORS.gray, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipCard />} />
                <Bar dataKey="Weighted Revenue" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          <p className="chart-note">
            Probability-adjusted pipeline view based on each deal’s forecast quarter and win rate.
          </p>
        </article>
      </div>
    </section>
  )
}
