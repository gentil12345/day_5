import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const toLocalDatetime = (date) => {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

export default function ParkingRecords() {
  const [records, setRecords] = useState([]);
  const [cars, setCars] = useState([]);
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({ PlateNumber: '', SlotNumber: '', EntryTime: toLocalDatetime(new Date()) });
  const [exitForm, setExitForm] = useState({ RecordID: '', ExitTime: toLocalDatetime(new Date()) });
  const [editRecord, setEditRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [tab, setTab] = useState('all');

  const fetchAll = () => {
    Promise.all([
      api.get('/records'),
      api.get('/cars'),
      api.get('/slots/available'),
    ]).then(([recRes, carRes, slotRes]) => {
      setRecords(recRes.data);
      setCars(carRes.data);
      setSlots(slotRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.PlateNumber || !form.SlotNumber || !form.EntryTime) {
      showMessage('All fields are required.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/records', {
        ...form,
        EntryTime: new Date(form.EntryTime).toISOString().slice(0, 19).replace('T', ' '),
      });
      showMessage('Car entry recorded successfully!');
      setForm({ PlateNumber: '', SlotNumber: '', EntryTime: toLocalDatetime(new Date()) });
      fetchAll();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to record entry.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openExitModal = (record) => {
    setExitForm({ RecordID: record.RecordID, ExitTime: toLocalDatetime(new Date()) });
    setShowExitModal(true);
  };

  const handleExit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.put(`/records/${exitForm.RecordID}`, {
        ExitTime: new Date(exitForm.ExitTime).toISOString().slice(0, 19).replace('T', ' '),
      });
      showMessage(`Exit recorded. Duration: ${res.data.Duration}h. Amount due: ${res.data.AmountDue.toLocaleString()} RWF`);
      setShowExitModal(false);
      fetchAll();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to record exit.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this parking record?')) return;
    try {
      await api.delete(`/records/${id}`);
      showMessage('Record deleted.');
      fetchAll();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to delete record.', 'error');
    }
  };

  const activeRecords = records.filter((r) => !r.ExitTime);
  const completedRecords = records.filter((r) => r.ExitTime);
  const displayRecords = tab === 'active' ? activeRecords : tab === 'completed' ? completedRecords : records;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">📋 Parking Records</h1>
        <p className="text-slate-500 text-sm mt-1">Record car entries and exits</p>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
          message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message.type === 'error' ? '⚠️' : '✅'} {message.text}
        </div>
      )}

      {/* Entry Form */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Record Car Entry</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Plate Number <span className="text-red-500">*</span>
            </label>
            <select
              name="PlateNumber"
              value={form.PlateNumber}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Car --</option>
              {cars.map((c) => (
                <option key={c.PlateNumber} value={c.PlateNumber}>
                  {c.PlateNumber} — {c.DriverName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Slot Number <span className="text-red-500">*</span>
            </label>
            <select
              name="SlotNumber"
              value={form.SlotNumber}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Available Slot --</option>
              {slots.map((s) => (
                <option key={s.SlotNumber} value={s.SlotNumber}>{s.SlotNumber}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Entry Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              name="EntryTime"
              value={form.EntryTime}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {submitting ? '⏳ Recording...' : '🚗 Record Entry'}
            </button>
          </div>
        </form>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-slate-700">Parking Records ({displayRecords.length})</h2>
          <div className="flex gap-2">
            {[
              { key: 'all', label: `All (${records.length})` },
              { key: 'active', label: `Active (${activeRecords.length})` },
              { key: 'completed', label: `Completed (${completedRecords.length})` },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  tab === t.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
        ) : displayRecords.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <span className="text-4xl block mb-2">📋</span>
            <p>No records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="text-left px-3 py-2 rounded-l-lg">ID</th>
                  <th className="text-left px-3 py-2">Plate</th>
                  <th className="text-left px-3 py-2">Driver</th>
                  <th className="text-left px-3 py-2">Slot</th>
                  <th className="text-left px-3 py-2">Entry Time</th>
                  <th className="text-left px-3 py-2">Exit Time</th>
                  <th className="text-left px-3 py-2">Duration</th>
                  <th className="text-left px-3 py-2">Amount</th>
                  <th className="text-left px-3 py-2 rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayRecords.map((r) => (
                  <tr key={r.RecordID} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-400">#{r.RecordID}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-blue-700">{r.PlateNumber}</td>
                    <td className="px-3 py-2">{r.DriverName}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.ExitTime ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {r.SlotNumber}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                      {new Date(r.EntryTime).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                      {r.ExitTime ? new Date(r.ExitTime).toLocaleString() : (
                        <span className="text-orange-500 font-medium">Still parked</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.Duration != null ? `${r.Duration}h` : '—'}
                    </td>
                    <td className="px-3 py-2 font-medium text-green-700">
                      {r.AmountPaid != null ? `${Number(r.AmountPaid).toLocaleString()} RWF` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {!r.ExitTime && (
                          <button
                            onClick={() => openExitModal(r)}
                            className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 px-2 py-1 rounded font-medium"
                          >
                            🚪 Exit
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(r.RecordID)}
                          className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded font-medium"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Exit Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">🚪 Record Car Exit</h3>
            <form onSubmit={handleExit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Exit Time</label>
                <input
                  type="datetime-local"
                  value={exitForm.ExitTime}
                  onChange={(e) => setExitForm({ ...exitForm, ExitTime: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium"
                >
                  {submitting ? '⏳ Processing...' : '✅ Confirm Exit'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowExitModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
