'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, FileDown, Calendar, ClipboardList, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function InventoryReportModal({ isOpen, onClose, items }) {
  const [reportType, setReportType] = useState('current'); // 'current' or 'history'
  const [dateRange, setDateRange] = useState('30days'); // '7days', '30days', 'all'
  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Branding and Common Header
      const now = new Date();
      const dateStr = now.toLocaleDateString();
      const timeStr = now.toLocaleTimeString();

      // Background accent
      doc.setFillColor(15, 23, 42); // slate-900 primary
      doc.rect(0, 0, 210, 30, 'F');

      // Brand Title
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('MAINTOPS PRO', 14, 18);

      // Metadata
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('Sistema de Gestión de Almacén', 14, 24);
      doc.text(`Emitido: ${dateStr} ${timeStr}`, 155, 18);
      doc.text('Confidencial / Uso Interno', 155, 24);

      if (reportType === 'current') {
        // REPORT TITLE
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('REPORTE DE INVENTARIO ACTUAL DE ALMACÉN', 14, 42);

        // Stats boxes
        const totalItems = items.length;
        const lowStock = items.filter(i => i.stock_current > 0 && i.stock_current <= i.stock_min).length;
        const zeroStock = items.filter(i => i.stock_current === 0).length;
        const totalVal = items.reduce((acc, i) => acc + (i.stock_current * (i.unit_price || 0)), 0);

        // Draw Stats Row
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(14, 48, 182, 16, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`Total Catálogo: ${totalItems} ítems`, 20, 58);
        doc.text(`Bajo Stock: ${lowStock}`, 65, 58);
        doc.text(`Agotado: ${zeroStock}`, 105, 58);
        doc.text(`Valor Estimado: $${totalVal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 145, 58);

        // Populate Table
        const body = items.map((item, idx) => [
          item.name || 'Sin nombre',
          item.part_number || 'N/A',
          item.location || 'Almacén',
          item.stock_min || 0,
          item.stock_current || 0,
          `$${(item.unit_price || 0).toFixed(2)}`
        ]);

        doc.autoTable({
          startY: 70,
          head: [['Nombre del Ítem', 'Nº Parte', 'Ubicación', 'Mín', 'Stock', 'Precio U. (USD)']],
          body: body,
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
          columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 35 },
            2: { cellWidth: 35 },
            3: { cellWidth: 15, halign: 'center' },
            4: { cellWidth: 15, halign: 'center' },
            5: { cellWidth: 27, halign: 'right' }
          },
          didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 4) {
              const stock = parseInt(data.cell.text[0]) || 0;
              const min = parseInt(data.row.cells[3].text[0]) || 0;
              if (stock === 0) {
                doc.setFillColor(254, 226, 226); // bg-red-100
                doc.setTextColor(220, 38, 38); // text-red-600
              } else if (stock <= min) {
                doc.setFillColor(255, 237, 213); // bg-orange-100
                doc.setTextColor(217, 119, 6); // text-orange-600
              }
            }
          }
        });

      } else {
        // REPORT TITLE FOR LOGS
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('REPORTE HISTÓRICO DE ENTRADAS Y SALIDAS', 14, 42);

        // Fetch logs based on range
        let query = supabase
          .from('inventory_logs')
          .select(`
            *,
            inventory (name, part_number),
            profiles:user_id (full_name)
          `)
          .order('created_at', { ascending: false });

        if (dateRange === '7days') {
          const cut = new Date();
          cut.setDate(cut.getDate() - 7);
          query = query.gte('created_at', cut.toISOString());
        } else if (dateRange === '30days') {
          const cut = new Date();
          cut.setDate(cut.getDate() - 30);
          query = query.gte('created_at', cut.toISOString());
        }

        const { data: logs, error } = await query;
        if (error) throw error;

        // Draw Stats Row
        const totalOps = logs?.length || 0;
        const entries = logs?.filter(l => l.type === 'entry').length || 0;
        const exits = logs?.filter(l => l.type === 'exit').length || 0;

        doc.setFillColor(241, 245, 249);
        doc.rect(14, 48, 182, 16, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`Operaciones: ${totalOps}`, 20, 58);
        doc.text(`Entradas registradas: ${entries}`, 65, 58);
        doc.text(`Salidas / Consumo: ${exits}`, 125, 58);

        // Populate Logs Table
        const body = (logs || []).map((log) => [
          new Date(log.created_at).toLocaleDateString(),
          log.inventory?.name || 'Ítem Eliminado',
          log.type === 'entry' ? 'ENTRADA' : 'SALIDA',
          log.quantity,
          log.reason || 'Sin detalles',
          log.profiles?.full_name || 'Almacén'
        ]);

        doc.autoTable({
          startY: 70,
          head: [['Fecha', 'Repuesto', 'Movimiento', 'Cant.', 'Motivo / Referencia', 'Autorizado Por']],
          body: body,
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 40 },
            2: { cellWidth: 23, fontStyle: 'bold', halign: 'center' },
            3: { cellWidth: 15, halign: 'center' },
            4: { cellWidth: 57 },
            5: { cellWidth: 27 }
          },
          didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
              const type = data.cell.text[0];
              if (type === 'ENTRADA') {
                doc.setTextColor(16, 185, 129); // text-emerald-500
              } else {
                doc.setTextColor(239, 68, 68); // text-red-500
              }
            }
          }
        });
      }

      // Download trigger
      const filename = `maintops-reporte-${reportType}-${now.toISOString().substring(0, 10)}.pdf`;
      doc.save(filename);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al generar el PDF: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <FileDown className="w-5 h-5 text-blue-500" />
              Exportar Reporte PDF
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Report Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Selecciona el tipo de reporte</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setReportType('current')}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border text-center transition-all ${
                    reportType === 'current'
                      ? 'bg-blue-600/10 text-blue-400 border-blue-500/30'
                      : 'bg-slate-950/50 text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                >
                  <ClipboardList className="w-6 h-6" />
                  <span className="text-xs font-bold">Inventario Actual</span>
                </button>
                <button
                  onClick={() => setReportType('history')}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border text-center transition-all ${
                    reportType === 'history'
                      ? 'bg-blue-600/10 text-blue-400 border-blue-500/30'
                      : 'bg-slate-950/50 text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                >
                  <Calendar className="w-6 h-6" />
                  <span className="text-xs font-bold">Entradas y Salidas</span>
                </button>
              </div>
            </div>

            {/* Date Range Selector - Only visible for 'history' */}
            {reportType === 'history' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Rango de tiempo</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="7days">Últimos 7 días</option>
                  <option value="30days">Últimos 30 días</option>
                  <option value="all">Todo el historial</option>
                </select>
              </motion.div>
            )}

            {/* Warning or notes */}
            <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-xs text-slate-500 space-y-1">
              <p className="font-bold text-slate-400">💡 Nota de impresión:</p>
              {reportType === 'current' ? (
                <p>El reporte de inventario incluye el valor total estimado con base en las existencias y sus precios unitarios actuales.</p>
              ) : (
                <p>El reporte de historial incluye las salidas con los motivos completos (detalles de producción, solicitante y órdenes de trabajo asociadas).</p>
              )}
            </div>

            {/* Generate Trigger */}
            <button
              onClick={generatePDF}
              disabled={generating}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-2xl font-bold shadow-xl shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-5 h-5" />
                  <span>Generar y Descargar PDF</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
