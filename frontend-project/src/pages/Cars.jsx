import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const emptyForm = { PlateNumber: '', DriverName: '', PhoneNumber: '' };

export default function Cars() {
  const [cars, setCars] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState('');

  const fetchCars = () => {
    api.get('/cars')
      .then((res) => setCars(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCars(); }, []);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.PlateNumber || !form.DriverName || !form.PhoneNumber) {
      showMessage('All fields are required.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/cars', form);
      showMessage(`Car ${form.PlateNumber} registered successfully!`);
      setForm(emptyForm);
      fetchCars();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to register car.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (plateNumber) => {
    if (!window.confirm(`Delete car ${plateNumber}?`)) return;
    try {
      await api.delete(`/cars/${plateNumber}`);
      showMessage(`Car ${plateNumber} deleted.`);
      fetchCars();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to delete car.', 'error');
    }
  };

  const filtered = cars.filter(
    (c) =>
      c.PlateNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.DriverName.toLowerCase().includes(search.toLowerCase()) ||
      c.PhoneNumber.includes(search)
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">🚗 Car Management</h1>
        <p className="text-slate-500 text-sm mt-1">Register and manage vehicles</p>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
          message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message.type === 'error' ? '⚠️' : '✅'} {message.text}
        </div>
      )}

      {/* Registration Form */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Register New Car</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Plate Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="PlateNumber"
              value={form.PlateNumber}
              onChange={handleChange}
              placeholder="e.g. RAB 123 A"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Driver Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="DriverName"
              value={form.DriverName}
              onChange={handleChange}
              placeholder="Full name"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="PhoneNumber"
              value={form.PhoneNumber}
              onChange={handleChange}
              placeholder="e.g. 0788123456"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {submitting ? '⏳ Registering...' : '➕ Register Car'}
            </button>
          </div>
        </form>
      </div>

      {/* Cars Table */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-700">Registered Cars ({filtered.length})</h2>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
        </div>

        {loading ? (
          <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <span className="text-4xl block mb-2">🚗</span>
            <p>No cars found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="text-left px-3 py-2 rounded-l-lg">#</th>
                  <th className="text-left px-3 py-2">Plate Number</th>
                  <th className="text-left px-3 py-2">Driver Name</th>
                  <th className="text-left px-3 py-2">Phone Number</th>
                  <th className="text-left px-3 py-2 rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((car, i) => (
                  <tr key={car.PlateNumber} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-blue-700">{car.PlateNumber}</td>
                    <td className="px-3 py-2">{car.DriverName}</td>
                    <td className="px-3 py-2">{car.PhoneNumber}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleDelete(car.PlateNumber)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
