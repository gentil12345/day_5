import React, { useEffect, useState, useRef } from 'react';
import api from '../api/axios';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [unpaidRecords, setUnpaidRecords] = useState([]);
  const [form, setForm] = useState({ RecordID: '', AmountPaid: '' });
  const [selectedBill, setSelectedBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [showBill, setShowBill] = useState(false);
  const billRef = useRef();

  const RATE = 500;

  const fetchData = async () => {
    try {
      const [payRes, recRes] = await Promise.all([
        api.get('/payments'),
        api.get('/records'),
      ]);
      setPayments(payRes.data);
      // Filter records that have exit time but no payment
      const paidIds = new Set(payRes.data.map((p) => p.RecordID));
      const unpaid = recRes.data.filter((r) => r.ExitTime && !paidIds.has(r.RecordID));
      setUnpaidRecords(unpaid);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const calcFee = (duration) => {
    if (!duration) return 0;
    const billable = duration < 1 ? 1 : Math.ceil(duration);
    return billable * RATE;
  };

  const handleRecordSelect = (e) => {
    const id = e.target.value;
    const record = unpaidRecords.find((r) => r.RecordID === parseInt(id));
    if (record) {
      setForm({ RecordID: id, AmountPaid: calcFee(record.Duration) });
    } else {
      setForm({ RecordID: id, AmountPaid: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.RecordID || !form.AmountPaid) {
      showMessage('Please select a record and enter amount.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/payments', {
        RecordID: parseInt(form.RecordID),
        AmountPaid: parseFloat(form.AmountPaid),
        PaymentDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });
      showMessage('Payment recorded successfully!');
      setForm({ RecordID: '', AmountPaid: '' });
      fetchData();
      // Show bill
      setSelectedBill(res.data);
      setShowBill(true);
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to record payment.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const viewBill = async (paymentId) => {
    try {
      const res = await api.get(`/payments/${paymentId}`);
      setSelectedBill(res.data);
      setShowBill(true);
    } catch (err) {
      showMessage('Failed to load bill.', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedRecord = unpaidRecords.find((r) => r.RecordID === parseInt(form.RecordID));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">💳 Payments</h1>
        <p className="text-slate-500 text-sm mt-1">Process parking fee payments and generate bills</p>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
          message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message.type === 'error' ? '⚠️' : '✅'} {message.text}
        </div>
      )}

      {/* Payment Form */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Record Payment</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select Parking Record <span className="text-red-500">*</span>
            </label>
            <select
              value={form.RecordID}
              onChange={handleRecordSelect}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select completed record --</option>
              {unpaidRecords.map((r) => (
                <option key={r.RecordID} value={r.RecordID}>
                  #{r.RecordID} — {r.PlateNumber} ({r.DriverName}) — {r.Duration}h — {calcFee(r.Duration).toLocaleString()} RWF
                </option>
              ))}
            </select>
            {unpaidRecords.length === 0 && (
              <p className="text-xs text-slate-400 mt-1">No pending payments</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Amount Paid (RWF) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.AmountPaid}
              onChange={(e) => setForm({ ...form, AmountPaid: e.target.value })}
              placeholder="Amount in RWF"
              min="0"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {selectedRecord && (
            <div className="md:col-span-2 bg-blue-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-blue-800 mb-1">Fee Breakdown</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-blue-700">
                <span>Duration: <strong>{selectedRecord.Duration}h</strong></span>
                <span>Billable: <strong>{selectedRecord.Duration < 1 ? 1 : Math.ceil(selectedRecord.Duration)}h</strong></span>
                <span>Rate: <strong>{RATE} RWF/hr</strong></span>
                <span>Total: <strong>{calcFee(selectedRecord.Duration).toLocaleString()} RWF</strong></span>
              </div>
            </div>
          )}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {submitting ? '⏳ Processing...' : '💳 Record Payment & Generate Bill'}
            </button>
          </div>
        </form>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Payment History ({payments.length})</h2>

        {loading ? (
          <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <span className="text-4xl block mb-2">💳</span>
            <p>No payments recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="text-left px-3 py-2 rounded-l-lg">ID</th>
                  <th className="text-left px-3 py-2">Plate</th>
                  <th className="text-left px-3 py-2">Driver</th>
                  <th className="text-left px-3 py-2">Duration</th>
                  <th className="text-left px-3 py-2">Amount Paid</th>
                  <th className="text-left px-3 py-2">Payment Date</th>
                  <th className="text-left px-3 py-2 rounded-r-lg">Bill</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.PaymentID} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-400">#{p.PaymentID}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-blue-700">{p.PlateNumber}</td>
                    <td className="px-3 py-2">{p.DriverName}</td>
                    <td className="px-3 py-2">{p.Duration}h</td>
                    <td className="px-3 py-2 font-semibold text-green-700">{Number(p.AmountPaid).toLocaleString()} RWF</td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                      {new Date(p.PaymentDate).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => viewBill(p.PaymentID)}
                        className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded font-medium"
                      >
                        🧾 View Bill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bill Modal */}
      {showBill && selectedBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div ref={billRef} className="p-6">
              {/* Bill Header */}
              <div className="text-center border-b-2 border-blue-700 pb-4 mb-4">
                <div className="text-4xl mb-2">🅿️</div>
                <h2 className="text-2xl font-bold text-blue-700">SmartPark</h2>
                <p className="text-slate-500 text-sm">Parking Space Sales Management System</p>
                <p className="text-slate-400 text-xs">Rubavu District, Western Province, Rwanda</p>
                <p className="text-slate-400 text-xs mt-1">Tel: +250 788 000 000</p>
              </div>

              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wide">Parking Invoice / Bill</h3>
                <p className="text-xs text-slate-400">
                  Bill #{selectedBill.PaymentID || 'N/A'} | {new Date(selectedBill.PaymentDate || Date.now()).toLocaleString()}
                </p>
              </div>

              {/* Bill Details */}
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Plate Number</span>
                  <span className="font-mono font-bold text-blue-700">{selectedBill.PlateNumber}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Driver Name</span>
                  <span className="font-medium">{selectedBill.DriverName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Phone Number</span>
                  <span>{selectedBill.PhoneNumber}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Slot Number</span>
                  <span className="font-medium">{selectedBill.SlotNumber}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Entry Time</span>
                  <span>{new Date(selectedBill.EntryTime).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Exit Time</span>
                  <span>{new Date(selectedBill.ExitTime).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-medium">{selectedBill.Duration} hours</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Rate</span>
                  <span>500 RWF / hour (min. 1 hour)</span>
                </div>
              </div>

              {/* Total */}
              <div className="bg-blue-700 text-white rounded-lg p-3 flex justify-between items-center">
                <span className="font-semibold">TOTAL AMOUNT PAID</span>
                <span className="text-xl font-bold">
                  {Number(selectedBill.AmountPaid).toLocaleString()} RWF
                </span>
              </div>

              <p className="text-center text-xs text-slate-400 mt-4">
                Thank you for using SmartPark! Drive safely. 🚗
              </p>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3 no-print">
              <button
                onClick={handlePrint}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium"
              >
                🖨️ Print Bill
              </button>
              <button
                onClick={() => setShowBill(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
