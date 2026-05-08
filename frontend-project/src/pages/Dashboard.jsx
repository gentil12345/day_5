import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

function StatCard({ icon, label, value, color, link }) {
  return (
    <Link to={link || '#'} className={`block bg-white rounded-xl shadow p-5 border-l-4 ${color} hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{value ?? '—'}</p>
        </div>
        <span className="text-4xl opacity-80">{icon}</span>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [active, setActive] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/summary'),
      api.get('/reports/active'),
    ])
      .then(([summaryRes, activeRes]) => {
        setStats(summaryRes.data);
        setActive(activeRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">SmartPark — Real-time parking overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="🅿️" label="Total Slots" value={stats?.totalSlots} color="border-blue-500" link="/slots" />
        <StatCard icon="✅" label="Available Slots" value={stats?.availableSlots} color="border-green-500" link="/slots" />
        <StatCard icon="🚗" label="Occupied Slots" value={stats?.occupiedSlots} color="border-orange-500" link="/records" />
        <StatCard icon="👥" label="Registered Cars" value={stats?.totalCars} color="border-purple-500" link="/cars" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard icon="📋" label="Total Records" value={stats?.totalRecords} color="border-slate-500" link="/records" />
        <StatCard icon="💰" label="Today's Revenue" value={`${Number(stats?.todayRevenue || 0).toLocaleString()} RWF`} color="border-yellow-500" link="/payments" />
        <StatCard icon="💵" label="Total Revenue" value={`${Number(stats?.totalRevenue || 0).toLocaleString()} RWF`} color="border-teal-500" link="/reports" />
      </div>

      {/* Currently Parked */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-700">
            🚗 Currently Parked ({active.length})
          </h2>
          <Link to="/records" className="text-blue-600 hover:underline text-sm">View All Records →</Link>
        </div>

        {active.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <span className="text-4xl block mb-2">🅿️</span>
            <p>No cars currently parked</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="text-left px-3 py-2 rounded-l-lg">Plate Number</th>
                  <th className="text-left px-3 py-2">Driver</th>
                  <th className="text-left px-3 py-2">Slot</th>
                  <th className="text-left px-3 py-2">Entry Time</th>
                  <th className="text-left px-3 py-2 rounded-r-lg">Duration</th>
                </tr>
              </thead>
              <tbody>
                {active.map((car) => {
                  const mins = car.MinutesParked;
                  const hrs = Math.floor(mins / 60);
                  const rem = mins % 60;
                  return (
                    <tr key={car.RecordID} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono font-semibold text-blue-700">{car.PlateNumber}</td>
                      <td className="px-3 py-2">{car.DriverName}</td>
                      <td className="px-3 py-2">
                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          {car.SlotNumber}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {new Date(car.EntryTime).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {hrs > 0 ? `${hrs}h ` : ''}{rem}m
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
