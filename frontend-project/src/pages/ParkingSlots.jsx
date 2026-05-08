import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const emptyForm = { SlotNumber: '', SlotStatus: 'Available' };

export default function ParkingSlots() {
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [filter, setFilter] = useState('All');

  const fetchSlots = () => {
    api.get('/slots')
      .then((res) => setSlots(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSlots(); }, []);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.SlotNumber) {
      showMessage('Slot number is required.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/slots', form);
      showMessage(`Slot ${form.SlotNumber} added successfully!`);
      setForm(emptyForm);
      fetchSlots();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to add slot.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (slotNumber) => {
    if (!window.confirm(`Delete slot ${slotNumber}?`)) return;
    try {
      await api.delete(`/slots/${slotNumber}`);
      showMessage(`Slot ${slotNumber} deleted.`);
      fetchSlots();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to delete slot.', 'error');
    }
  };

  const handleToggleStatus = async (slot) => {
    const newStatus = slot.SlotStatus === 'Available' ? 'Occupied' : 'Available';
    try {
      await api.put(`/slots/${slot.SlotNumber}`, { SlotStatus: newStatus });
      showMessage(`Slot ${slot.SlotNumber} marked as ${newStatus}.`);
      fetchSlots();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to update slot.', 'error');
    }
  };

  const filtered = filter === 'All' ? slots : slots.filter((s) => s.SlotStatus === filter);

  const available = slots.filter((s) => s.SlotStatus === 'Available').length;
  const occupied = slots.filter((s) => s.SlotStatus === 'Occupied').length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">🅿️ Parking Slots</h1>
        <p className="text-slate-500 text-sm mt-1">Manage parking slot availability</p>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
          message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message.type === 'error' ? '⚠️' : '✅'} {message.text}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 text-center border-l-4 border-blue-500">
          <p className="text-2xl font-bold text-slate-800">{slots.length}</p>
          <p className="text-sm text-slate-500">Total Slots</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center border-l-4 border-green-500">
          <p className="text-2xl font-bold text-green-600">{available}</p>
          <p className="text-sm text-slate-500">Available</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center border-l-4 border-orange-500">
          <p className="text-2xl font-bold text-orange-600">{occupied}</p>
          <p className="text-sm text-slate-500">Occupied</p>
        </div>
      </div>

      {/* Add Slot Form */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Add New Parking Slot</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Slot Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="SlotNumber"
              value={form.SlotNumber}
              onChange={handleChange}
              placeholder="e.g. A1, B2"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              name="SlotStatus"
              value={form.SlotStatus}
              onChange={handleChange}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {submitting ? '⏳ Adding...' : '➕ Add Slot'}
          </button>
        </form>
      </div>

      {/* Slots Grid */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-700">Parking Slots ({filtered.length})</h2>
          <div className="flex gap-2">
            {['All', 'Available', 'Occupied'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <span className="text-4xl block mb-2">🅿️</span>
            <p>No slots found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filtered.map((slot) => (
              <div
                key={slot.SlotNumber}
                className={`rounded-xl p-3 text-center border-2 transition-all ${
                  slot.SlotStatus === 'Available'
                    ? 'bg-green-50 border-green-300'
                    : 'bg-orange-50 border-orange-300'
                }`}
              >
                <p className="font-bold text-lg text-slate-800">{slot.SlotNumber}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  slot.SlotStatus === 'Available'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {slot.SlotStatus}
                </span>
                <div className="flex gap-1 mt-2 justify-center">
                  <button
                    onClick={() => handleToggleStatus(slot)}
                    title="Toggle status"
                    className="text-xs text-blue-600 hover:text-blue-800 px-1"
                  >
                    🔄
                  </button>
                  <button
                    onClick={() => handleDelete(slot.SlotNumber)}
                    title="Delete slot"
                    className="text-xs text-red-500 hover:text-red-700 px-1"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
