'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  FileDown, 
  Send, 
  Check, 
  X, 
  Clock,
  AlertCircle,
  Building,
  Mail,
  User,
  Paperclip,
  Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PurchaseRequestModal from '@/components/purchases/PurchaseRequestModal';

export default function PurchasesPage() {
  const { user, profile } = useAuth();
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [editingReq, setEditingReq] = useState(null);
  
  // Email modal input
  const [bossEmails, setBossEmails] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // User's managed inventories (for creating new request)
  const [userInventories, setUserInventories] = useState([]);
  const [selectedInvId, setSelectedInvId] = useState('');
  const [selectedInvName, setSelectedInvName] = useState('');

  const handleOpenEditModal = (req) => {
    setEditingReq(req);
    setIsRequestModalOpen(true);
  };

  const fetchUserInventories = async () => {
    if (!supabase || !profile) return;
    try {
      const { data, error } = await supabase
        .from('inventories')
        .select('id, name, responsable_id')
        .order('name');
      
      if (error) throw error;
      if (data) {
        let filtered = data;
        const isManager = profile.role === 'admin' || profile.role === 'supervisor';
        if (!isManager) {
          filtered = data.filter(inv => inv.responsable_id === profile.id);
        }
        setUserInventories(filtered);
        if (filtered.length > 0) {
          setSelectedInvId(filtered[0].id);
          setSelectedInvName(filtered[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching user inventories:', err);
    }
  };

  const fetchRequisitions = async () => {
    if (!supabase || !profile) return;
    setLoading(true);
    try {
      const isManager = profile.role === 'admin' || profile.role === 'supervisor' || profile.role === 'buyer';
      
      let query = supabase
        .from('purchase_requisitions')
        .select(`
          *,
          inventories!inner(id, name, responsable_id),
          profiles:requester_id(full_name, email),
          purchase_requisition_items(*)
        `)
        .order('created_at', { ascending: false });

      if (!isManager) {
        query = query.eq('inventories.responsable_id', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequisitions(data || []);
    } catch (err) {
      console.error('Error fetching requisitions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchRequisitions();
      fetchUserInventories();
    }
  }, [profile]);

  // Real-time synchronization
  useEffect(() => {
    if (!supabase || !profile) return;

    const channel = supabase.channel('purchases-sync')
      .on('postgres_changes', { event: '*', table: 'purchase_requisitions' }, () => fetchRequisitions())
      .on('postgres_changes', { event: '*', table: 'purchase_requisition_items' }, () => fetchRequisitions())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const handleUpdateStatus = async (id, newStatus) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('purchase_requisitions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      
      setRequisitions(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    } catch (err) {
      console.error('Error updating requisition status:', err);
      alert('Error al actualizar el estatus de la requisición.');
    }
  };

  const generatePDFBlob = async (req) => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    // Company Header
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(15, 15, 185, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TEMPLE PP - REQUISICION ORDEN DE COMPRA', 20, 22.5);

    // Folio box
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.rect(145, 15, 55, 12, 'F');
    doc.setTextColor(30, 41, 59);
    doc.text(`FOLIO: ${req.folio}`, 150, 22.5);

    // Metadata Grid
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    doc.text('TIPO DE SOLICITUD:', 15, 36);
    doc.setFont('helvetica', 'bold');
    doc.text(req.type === 'american' ? 'AMERICAN (USD)' : 'MEXICAN (MXP)', 50, 36);

    doc.setFont('helvetica', 'normal');
    doc.text('FECHA:', 120, 36);
    doc.setFont('helvetica', 'bold');
    doc.text(new Date(req.created_at).toLocaleDateString(), 150, 36);

    doc.setFont('helvetica', 'normal');
    doc.text('PROVEEDOR:', 15, 43);
    doc.setFont('helvetica', 'bold');
    doc.text(req.provider || 'N/A', 50, 43);

    doc.setFont('helvetica', 'normal');
    doc.text('DEPARTAMENTO:', 120, 43);
    doc.setFont('helvetica', 'bold');
    doc.text(req.department || 'N/A', 150, 43);

    doc.setFont('helvetica', 'normal');
    doc.text('REQUISITOR:', 15, 50);
    doc.setFont('helvetica', 'bold');
    doc.text(req.profiles?.full_name || 'N/A', 50, 50);

    doc.setFont('helvetica', 'normal');
    doc.text('MONEDA / T.C.:', 120, 50);
    doc.setFont('helvetica', 'bold');
    doc.text(`${req.currency} ${req.type === 'american' ? `(T.C. ${req.ex_rate || '1.0'})` : ''}`, 150, 50);

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 55, 200, 55);

    // Items Table
    const tableData = (req.purchase_requisition_items || []).map((item) => [
      item.qty.toString(),
      item.description,
      `${req.currency} $${(item.unit_price || 0).toFixed(2)}`,
      `${req.currency} $${(item.qty * (item.unit_price || 0)).toFixed(2)}`,
      item.dept_client || ''
    ]);

    autoTable(doc, {
      startY: 60,
      head: [['CANT.', 'DESCRIPCION / ARTICULO', 'PRECIO UNIT.', 'TOTAL', 'DEPT / CLIENTE']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 75 },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 35 }
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      }
    });

    const finalY = doc.lastAutoTable.finalY || 100;

    // Calculation of Totals
    const subtotal = (req.purchase_requisition_items || []).reduce((acc, item) => acc + item.qty * (item.unit_price || 0), 0);
    const iva = subtotal * 0.08;
    const total = subtotal + iva;

    // Totals block
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('SUBTOTAL:', 130, finalY + 10);
    doc.text('IVA 8%:', 130, finalY + 16);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 130, finalY + 22);

    doc.setFont('helvetica', 'normal');
    doc.text(`${req.currency} $${subtotal.toFixed(2)}`, 165, finalY + 10, { align: 'right' });
    doc.text(`${req.currency} $${iva.toFixed(2)}`, 165, finalY + 16, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`${req.currency} $${total.toFixed(2)}`, 165, finalY + 22, { align: 'right' });

    // Notes/Justification on the left
    if (req.notes) {
      doc.setFont('helvetica', 'bold');
      doc.text('NOTAS / JUSTIFICACION:', 15, finalY + 10);
      doc.setFont('helvetica', 'normal');
      const splitNotes = doc.splitTextToSize(req.notes, 100);
      doc.text(splitNotes, 15, finalY + 15);
    }

    // Signature lines
    const signatureY = finalY + 45;
    doc.line(20, signatureY, 80, signatureY);
    doc.text('FIRMA SOLICITANTE', 32, signatureY + 5);

    doc.line(130, signatureY, 190, signatureY);
    doc.text('AUTORIZADO POR', 148, signatureY + 5);

    return doc;
  };

  const handleDownloadPDF = async (req) => {
    try {
      const doc = await generatePDFBlob(req);
      doc.save(`Requisicion-${req.folio}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error al generar el archivo PDF.');
    }
  };

  const handleOpenSendEmail = (req) => {
    setSelectedReq(req);
    setBossEmails(req.boss_emails || '');
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!bossEmails.trim()) {
      alert('Escribe al menos un correo electrónico.');
      return;
    }
    setSendingEmail(true);
    try {
      // 1. Generate PDF base64
      const doc = await generatePDFBlob(selectedReq);
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      // 2. Call send email API
      const res = await fetch('/api/send-requisition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toEmails: bossEmails,
          folio: selectedReq.folio,
          requesterName: selectedReq.profiles?.full_name,
          inventoryName: selectedReq.inventories?.name,
          pdfBase64,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error al enviar');

      // 3. Update requisition in DB with boss emails and status
      const { error: dbError } = await supabase
        .from('purchase_requisitions')
        .update({ 
          boss_emails: bossEmails,
          status: 'sent_for_approval',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReq.id);

      if (dbError) throw dbError;

      alert(`Correo enviado exitosamente a: ${bossEmails}`);
      setIsEmailModalOpen(false);
      setSelectedReq(null);
      await fetchRequisitions();
    } catch (err) {
      console.error('Error sending email:', err);
      alert('Error al enviar el correo: ' + err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-2.5 py-1 text-xs font-bold text-orange-400 bg-orange-400/10 rounded-full border border-orange-500/20">Pendiente</span>;
      case 'approved':
        return <span className="px-2.5 py-1 text-xs font-bold text-blue-400 bg-blue-400/10 rounded-full border border-blue-500/20">Aprobado / Por Comprar</span>;
      case 'sent_for_approval':
        return <span className="px-2.5 py-1 text-xs font-bold text-yellow-400 bg-yellow-400/10 rounded-full border border-yellow-500/20">Enviada a Jefes</span>;
      case 'completed':
        return <span className="px-2.5 py-1 text-xs font-bold text-emerald-400 bg-emerald-400/10 rounded-full border border-emerald-500/20">Completada</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 text-xs font-bold text-red-400 bg-red-400/10 rounded-full border border-red-500/20">Rechazada</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold text-slate-400 bg-slate-400/10 rounded-full border border-slate-500/20">{status}</span>;
    }
  };

  const filteredRequisitions = requisitions.filter(r => {
    const matchesSearch = r.folio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.provider?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.inventories?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isPurchaser = profile?.role === 'admin' || profile?.role === 'buyer';

  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-950 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-600 rounded-2xl shadow-lg shadow-violet-900/20">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Órdenes de Compra</h1>
            <p className="text-slate-400 text-sm">Gestiona y autoriza las requisiciones de material del inventario.</p>
          </div>
        </div>

        {userInventories.length > 0 && (
          <div className="flex items-center gap-3">
            {userInventories.length > 1 && (
              <select
                value={selectedInvId}
                onChange={e => {
                  setSelectedInvId(e.target.value);
                  setSelectedInvName(userInventories.find(i => i.id === parseInt(e.target.value))?.name || '');
                }}
                className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 focus:outline-none focus:border-violet-500 font-semibold"
              >
                {userInventories.map(inv => (
                  <option key={inv.id} value={inv.id}>{inv.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => {
                setEditingReq(null);
                setIsRequestModalOpen(true);
              }}
              className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-violet-900/20 transition-all active:scale-95 flex items-center justify-center gap-2 w-full md:w-auto"
            >
              <Plus className="w-5 h-5" /> Nueva Solicitud
            </button>
          </div>
        )}
      </div>

      {/* Main filters & search */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl p-6 gap-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar por Folio, Proveedor, Requisitor..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-violet-500 transition-all placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-1.5 overflow-x-auto w-full md:w-auto">
            {['all', 'pending', 'approved', 'sent_for_approval', 'completed', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap capitalize ${
                  statusFilter === status ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-350'
                }`}
              >
                {status === 'all' ? 'Todo' : 
                 status === 'pending' ? 'Pendientes' : 
                 status === 'approved' ? 'Aprobadas' : 
                 status === 'sent_for_approval' ? 'Enviadas' : 
                 status === 'completed' ? 'Completadas' : 'Rechazadas'}
              </button>
            ))}
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              <p className="text-slate-500 text-sm font-medium">Cargando solicitudes...</p>
            </div>
          ) : filteredRequisitions.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-4">
              <ShoppingCart className="w-16 h-16 opacity-10" />
              <p className="italic font-medium text-lg">No se encontraron requisiciones.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-950/30 text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-slate-800/50">
                  <th className="px-6 py-5">Folio / Fecha</th>
                  <th className="px-6 py-5">Almacén / Requisitor</th>
                  <th className="px-6 py-5">Proveedor / Moneda</th>
                  <th className="px-6 py-5 text-right">Items / Total</th>
                  <th className="px-6 py-5 text-center">Estatus</th>
                  <th className="px-6 py-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {filteredRequisitions.map(req => {
                  const subtotal = (req.purchase_requisition_items || []).reduce((acc, item) => acc + item.qty * (item.unit_price || 0), 0);
                  const total = subtotal * 1.08;

                  return (
                    <tr key={req.id} className="group hover:bg-white/[0.01] transition-all">
                      <td className="px-6 py-4">
                        <p className="font-bold text-white text-sm">{req.folio}</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(req.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-slate-500" />
                            {req.inventories?.name}
                          </span>
                          <span className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-600" />
                            {req.profiles?.full_name || 'Desconocido'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-300">{req.provider || 'Sin proveedor'}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                          {req.currency} {req.type === 'american' ? `(T.C. ${req.ex_rate || '1.0'})` : ''}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm text-slate-300 font-bold">{req.purchase_requisition_items?.length || 0} art.</p>
                        <p className="text-sm font-black text-violet-400 mt-0.5">{req.currency} ${total.toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {/* Cotización adjunta link */}
                          {req.quotation_url && (
                            <a
                              href={req.quotation_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-violet-400 rounded-xl transition-all"
                              title="Ver Cotización Adjunta"
                            >
                              <Paperclip className="w-4 h-4" />
                            </a>
                          )}

                          {/* Generar/Descargar PDF */}
                          <button
                            onClick={() => handleDownloadPDF(req)}
                            className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-blue-400 rounded-xl transition-all"
                            title="Descargar PDF de Requisición"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>

                          {/* Modificar Requisición (Comprador o Admin, sólo si no está completada) */}
                          {isPurchaser && req.status !== 'completed' && (
                            <button
                              onClick={() => handleOpenEditModal(req)}
                              className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white rounded-xl transition-all"
                              title="Modificar Solicitud"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Enviar PDF por email */}
                          {isPurchaser && (req.status === 'approved' || req.status === 'sent_for_approval') && (
                            <button
                              onClick={() => handleOpenSendEmail(req)}
                              className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-yellow-400 rounded-xl transition-all"
                              title="Enviar por Correo a Jefes"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* Acciones de aprobación/rechazo para Comprador/Admin */}
                          {isPurchaser && req.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(req.id, 'approved')}
                                className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-all border border-emerald-500/20"
                                title="Aprobar Solicitud"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(req.id, 'rejected')}
                                className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all border border-red-500/20"
                                title="Rechazar Solicitud"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Completar */}
                          {isPurchaser && (req.status === 'approved' || req.status === 'sent_for_approval') && (
                            <button
                              onClick={() => handleUpdateStatus(req.id, 'completed')}
                              className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-all border border-emerald-500/20"
                              title="Marcar como Completada"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Requisition Creation / Editing Modal */}
      {(userInventories.length > 0 || editingReq) && (
        <PurchaseRequestModal
          isOpen={isRequestModalOpen}
          onClose={() => {
            setIsRequestModalOpen(false);
            setEditingReq(null);
          }}
          onSuccess={(reqData) => {
            fetchRequisitions();
            alert(editingReq ? 'Solicitud de compra modificada exitosamente.' : 'Solicitud de compra creada exitosamente.');
            setEditingReq(null);
          }}
          inventoryId={editingReq ? editingReq.inventory_id : parseInt(selectedInvId)}
          inventoryName={editingReq ? editingReq.inventories?.name : selectedInvName}
          requisition={editingReq}
        />
      )}

      {/* Email Sender Modal */}
      <AnimatePresence>
        {isEmailModalOpen && selectedReq && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-2xl border border-yellow-500/20">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Enviar Requisición a Jefes</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Se enviará el PDF oficial de la requisición adjunto.</p>
                </div>
              </div>

              <form onSubmit={handleSendEmail} className="space-y-4">
                <div className="bg-slate-950/40 p-4 border border-slate-800 rounded-2xl space-y-1">
                  <p className="text-sm font-semibold text-slate-350">Folio: {selectedReq.folio}</p>
                  <p className="text-xs text-slate-500">Proveedor: <span className="font-bold text-slate-300">{selectedReq.provider || 'N/A'}</span></p>
                  <p className="text-xs text-slate-500">Almacén: <span className="font-bold text-slate-300">{selectedReq.inventories?.name}</span></p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Correos de Aprobadores (Jefes)</label>
                  <input
                    required
                    type="text"
                    value={bossEmails}
                    onChange={e => setBossEmails(e.target.value)}
                    placeholder="ejemplo1@empresa.com, ejemplo2@empresa.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                  <p className="text-[10px] text-slate-500">Separa múltiples correos con comas.</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setIsEmailModalOpen(false); setSelectedReq(null); }}
                    className="flex-1 py-3 bg-slate-850 hover:bg-slate-800 text-white rounded-xl font-bold transition-all text-sm"
                    disabled={sendingEmail}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-violet-900/20 text-sm flex items-center justify-center gap-2"
                    disabled={sendingEmail}
                  >
                    {sendingEmail ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><Send className="w-4 h-4" /> Enviar PDF</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
