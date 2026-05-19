'use client';

import { useState, useEffect } from 'react';
import { supabase, itamSupabase } from '@/lib/supabase';
import { X, ArrowUpRight, ArrowDownRight, Clipboard, Save, Search, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StockAdjustmentModal({ isOpen, onClose, item, onSuccess }) {
  const [type, setType] = useState('entry'); // 'entry' or 'exit'
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  // Advanced States
  const [adjustmentCategory, setAdjustmentCategory] = useState('purchase');
  
  // For 'production'
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [isValidatingEmployee, setIsValidatingEmployee] = useState(false);
  const [employeeError, setEmployeeError] = useState('');
  
  // For 'work_order'
  const [activeOrders, setActiveOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  // For 'other'
  const [customReason, setCustomReason] = useState('');

  // Synchronize dynamic elements when modal opens or type changes
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setEmployeeNumber('');
      setEmployeeName('');
      setEmployeeError('');
      setSelectedOrderId('');
      setCustomReason('');
      
      if (type === 'entry') {
        setAdjustmentCategory('purchase');
      } else {
        setAdjustmentCategory('production');
      }
      
      fetchActiveOrders();
    }
  }, [isOpen, type]);

  const fetchActiveOrders = async () => {
    if (!supabase) return;
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          id, 
          description, 
          machines (name)
        `)
        .in('status', ['open', 'in_progress'])
        .order('id', { ascending: false });
      
      if (error) throw error;
      setActiveOrders(data || []);
    } catch (err) {
      console.error("Error fetching active orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Employee Number Verification Trigger
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (adjustmentCategory === 'production' && employeeNumber.trim()) {
        verifyEmployee();
      } else {
        setEmployeeName('');
        setEmployeeError('');
      }
    }, 600);
    
    return () => clearTimeout(delayDebounce);
  }, [employeeNumber, adjustmentCategory]);

  const verifyEmployee = async () => {
    if (!itamSupabase) return;
    setIsValidatingEmployee(true);
    setEmployeeError('');
    setEmployeeName('');
    try {
      const { data, error } = await itamSupabase
        .from('profiles')
        .select('full_name')
        .eq('employee_number', employeeNumber.trim())
        .maybeSingle();
      
      if (error) throw error;
      if (data) {
        setEmployeeName(data.full_name);
      } else {
        setEmployeeError('Número de empleado no encontrado en ITAM Desk.');
      }
    } catch (err) {
      console.error("Error validating employee:", err);
      setEmployeeError('Error al conectar con ITAM Desk.');
    } finally {
      setIsValidatingEmployee(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!item) return;
    setLoading(true);

    try {
      // 1. Build structured reason
      let finalReason = '';
      if (adjustmentCategory === 'purchase') {
        finalReason = 'Compra de Almacén / Abasto';
      } else if (adjustmentCategory === 'inventory_adjustment') {
        finalReason = 'Ajuste de Inventario';
      } else if (adjustmentCategory === 'production') {
        if (!employeeName) {
          alert('Por favor verifica el número de empleado antes de confirmar.');
          setLoading(false);
          return;
        }
        finalReason = `Producción - Solicitante: ${employeeName} (Empleado #${employeeNumber})`;
      } else if (adjustmentCategory === 'work_order') {
        if (!selectedOrderId) {
          alert('Por favor selecciona una Orden de Trabajo activa.');
          setLoading(false);
          return;
        }
        const order = activeOrders.find(o => String(o.id) === selectedOrderId);
        const machineName = order?.machines?.name || 'Desconocida';
        const desc = order?.description?.substring(0, 30) || 'Sin descripción';
        finalReason = `Orden de Trabajo #${selectedOrderId} - ${machineName} (${desc}...)`;
      } else {
        if (!customReason.trim()) {
          alert('Por favor especifica el motivo del ajuste.');
          setLoading(false);
          return;
        }
        finalReason = customReason;
      }

      const newStock = type === 'entry' 
        ? item.stock_current + quantity 
        : item.stock_current - quantity;

      if (newStock < 0) {
        alert('El stock no puede quedar en números negativos.');
        setLoading(false);
        return;
      }

      // 2. Update Inventory
      const { error: invError } = await supabase
        .from('inventory')
        .update({ stock_current: newStock })
        .eq('id', item.id);
      
      if (invError) throw invError;

      // 3. Log History
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('inventory_logs').insert([{
          item_id: item.id,
          type,
          quantity,
          previous_stock: item.stock_current,
          new_stock: newStock,
          reason: finalReason,
          user_id: user?.id
        }]);
      } catch (logErr) {
        console.warn("Log table not found or error:", logErr);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('Error al ajustar el stock');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !item) return null;

  const isSubmitDisabled = loading || 
    (adjustmentCategory === 'production' && !employeeName) || 
    (adjustmentCategory === 'work_order' && !selectedOrderId) ||
    (adjustmentCategory === 'other' && !customReason.trim());

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Clipboard className="w-5 h-5 text-blue-400" />
              Ajustar Stock
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Item details */}
          <div className="p-6 bg-slate-950/50 border-b border-slate-800/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-blue-400 font-bold border border-slate-700">
                {item.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{item.name}</p>
                <p className="text-xs text-slate-500">Stock Actual: <span className="text-slate-300 font-mono font-bold bg-slate-800 px-2 py-0.5 rounded ml-1">{item.stock_current}</span></p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* Entry / Exit Selector */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setType('entry')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
                  type === 'entry' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-850 text-slate-500 border border-transparent hover:text-slate-300'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" /> Entrada
              </button>
              <button 
                type="button"
                onClick={() => setType('exit')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
                  type === 'exit' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-850 text-slate-500 border border-transparent hover:text-slate-300'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" /> Salida
              </button>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Cantidad</label>
              <input 
                required
                type="number" 
                min="1"
                value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-2xl font-bold text-center text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Motivo Category */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Motivo / Referencia</label>
              <select
                value={adjustmentCategory}
                onChange={e => setAdjustmentCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500"
              >
                {type === 'entry' ? (
                  <>
                    <option value="purchase">Compra de Almacén / Abasto</option>
                    <option value="inventory_adjustment">Ajuste de Inventario</option>
                    <option value="other">Otro (Especificar)</option>
                  </>
                ) : (
                  <>
                    <option value="production">Producción (Requiere Empleado)</option>
                    <option value="work_order">Orden de Trabajo (Asociar consumo)</option>
                    <option value="inventory_adjustment">Ajuste de Inventario</option>
                    <option value="other">Otro (Especificar)</option>
                  </>
                )}
              </select>
            </div>

            {/* Dynamic Field: Producción (Employee Verification) */}
            {type === 'exit' && adjustmentCategory === 'production' && (
              <div className="space-y-3 p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Número de Empleado</label>
                  <div className="relative">
                    <input 
                      required
                      type="number"
                      value={employeeNumber}
                      onChange={e => setEmployeeNumber(e.target.value)}
                      placeholder="Ej: 1024"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-4 pr-10 text-white focus:outline-none focus:border-blue-500"
                    />
                    <div className="absolute right-3 top-3.5">
                      {isValidatingEmployee ? (
                        <div className="w-4 h-4 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
                      ) : (
                        <User className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Validation Response Panel */}
                <div>
                  {isValidatingEmployee && (
                    <p className="text-xs text-slate-500 animate-pulse">Consultando base de datos ITAM Desk...</p>
                  )}
                  {employeeName && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{employeeName}</span>
                    </div>
                  )}
                  {employeeError && (
                    <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{employeeError}</span>
                    </div>
                  )}
                  {!employeeNumber && !isValidatingEmployee && (
                    <p className="text-xs text-slate-500">Ingresa el ID de la persona que solicita el material.</p>
                  )}
                </div>
              </div>
            )}

            {/* Dynamic Field: Orden de Trabajo */}
            {type === 'exit' && adjustmentCategory === 'work_order' && (
              <div className="space-y-2 p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Vincular a Orden de Trabajo Activa</label>
                {loadingOrders ? (
                  <div className="py-2 text-center text-xs text-slate-500">Cargando órdenes...</div>
                ) : activeOrders.length > 0 ? (
                  <select
                    required
                    value={selectedOrderId}
                    onChange={e => setSelectedOrderId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="">-- Seleccionar Orden --</option>
                    {activeOrders.map(o => (
                      <option key={o.id} value={o.id}>
                        Orden #{o.id} - {o.machines?.name || 'Máquina'} ({o.description?.substring(0, 40) || 'Sin descripción'}...)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="py-2 text-center text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    No hay órdenes de trabajo activas en este momento.
                  </div>
                )}
              </div>
            )}

            {/* Dynamic Field: Otro / Comentarios */}
            {adjustmentCategory === 'other' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Especificar Motivo</label>
                <textarea 
                  required
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="Escribe el motivo del ajuste de inventario..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 h-24 text-sm resize-none"
                />
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isSubmitDisabled}
              className={`w-full py-4 rounded-2xl font-bold shadow-xl transition-all flex items-center justify-center gap-2 text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                type === 'entry' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-red-600 hover:bg-red-500 shadow-red-900/20'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Save className="w-5 h-5" /> Confirmar Ajuste</>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
