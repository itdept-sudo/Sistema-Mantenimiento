'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { X, ShoppingCart, Plus, Trash2, Package, Image, UploadCloud, FileCheck, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PurchaseRequestModal({ isOpen, onClose, onSuccess, inventoryId, inventoryName, requisition = null }) {
  const { user, profile } = useAuth();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    type: 'mexican',
    provider: '',
    department: '',
    currency: 'MXP',
    ex_rate: '',
    notes: '',
  });

  const [lineItems, setLineItems] = useState([
    { item_id: null, description: '', qty: 1, unit_price: '', dept_client: '', searchQuery: '', showDropdown: false }
  ]);

  useEffect(() => {
    const targetInventoryId = inventoryId || requisition?.inventory_id;
    if (isOpen && targetInventoryId) {
      fetchItems();
    }
  }, [isOpen, inventoryId, requisition]);

  useEffect(() => {
    if (isOpen) {
      if (requisition) {
        setFormData({
          type: requisition.type || 'mexican',
          provider: requisition.provider || '',
          department: requisition.department || '',
          currency: requisition.currency || 'MXP',
          ex_rate: requisition.ex_rate || '',
          notes: requisition.notes || '',
        });
        setExistingAttachmentUrl(requisition.quotation_url || null);
        setAttachmentFile(null);
        setAttachmentPreview(null);
        if (requisition.purchase_requisition_items && requisition.purchase_requisition_items.length > 0) {
          setLineItems(requisition.purchase_requisition_items.map(item => ({
            item_id: item.item_id,
            description: item.description,
            qty: item.qty,
            unit_price: item.unit_price,
            dept_client: item.dept_client || '',
            searchQuery: item.description,
            showDropdown: false
          })));
        } else {
          setLineItems([{ item_id: null, description: '', qty: 1, unit_price: '', dept_client: '', searchQuery: '', showDropdown: false }]);
        }
      } else {
        setFormData({
          type: 'mexican',
          provider: '',
          department: '',
          currency: 'MXP',
          ex_rate: '',
          notes: '',
        });
        setExistingAttachmentUrl(null);
        setAttachmentFile(null);
        setAttachmentPreview(null);
        setLineItems([{ item_id: null, description: '', qty: 1, unit_price: '', dept_client: '', searchQuery: '', showDropdown: false }]);
      }
    }
  }, [isOpen, requisition]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAttachmentFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setAttachmentPreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null); // PDF or other non-image
    }
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setExistingAttachmentUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fetchItems = async () => {
    const targetInventoryId = inventoryId || requisition?.inventory_id;
    if (!targetInventoryId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('id, name, unit, part_number, unit_price')
        .eq('inventory_id', targetInventoryId)
        .eq('is_deleted', false)
        .order('name');
      if (error) throw error;
      setInventoryItems(data || []);
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, { item_id: null, description: '', qty: 1, unit_price: '', dept_client: '', searchQuery: '', showDropdown: false }]);
  };

  const removeLineItem = (index) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index, field, value) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const selectInventoryItem = (lineIndex, item) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[lineIndex] = {
        ...updated[lineIndex],
        item_id: item.id,
        description: item.name + (item.part_number ? ` (${item.part_number})` : ''),
        unit_price: item.unit_price || '',
        searchQuery: item.name,
        showDropdown: false
      };
      return updated;
    });
  };

  const getFilteredItems = (query) => {
    if (!query.trim()) return inventoryItems.slice(0, 8);
    const q = query.toLowerCase();
    return inventoryItems.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.part_number && i.part_number.toLowerCase().includes(q))
    ).slice(0, 8);
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((acc, item) => {
      const qty = parseFloat(item.qty) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return acc + qty * price;
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lineItems.length === 0 || lineItems.every(li => !li.description.trim())) {
      alert('Agrega al menos un artículo a la requisición.');
      return;
    }
    setSubmitting(true);
    try {
      const targetInventoryId = inventoryId || requisition?.inventory_id;

      // Upload attachment if a new file was selected
      let attachmentUrl = existingAttachmentUrl || null;
      if (attachmentFile) {
        const ext = attachmentFile.name.split('.').pop();
        const fileName = `requisitions/${Date.now()}_${user?.id}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('machines')
          .upload(fileName, attachmentFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('machines').getPublicUrl(fileName);
        attachmentUrl = urlData.publicUrl;
      }
      
      let reqId = null;
      let reqData = null;

      if (requisition) {
        // Update existing requisition
        const { data, error: reqError } = await supabase
          .from('purchase_requisitions')
          .update({
            type: formData.type,
            provider: formData.provider || null,
            department: formData.department || null,
            currency: formData.currency,
            ex_rate: formData.ex_rate ? parseFloat(formData.ex_rate) : 1.0,
            notes: formData.notes || null,
            quotation_url: attachmentUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', requisition.id)
          .select()
          .single();

        if (reqError) throw reqError;
        reqId = requisition.id;
        reqData = data;

        // Delete existing items
        const { error: deleteError } = await supabase
          .from('purchase_requisition_items')
          .delete()
          .eq('requisition_id', requisition.id);

        if (deleteError) throw deleteError;
      } else {
        // Insert new requisition
        const { data: req, error: reqError } = await supabase
          .from('purchase_requisitions')
          .insert([{
            inventory_id: targetInventoryId,
            requester_id: user?.id,
            type: formData.type,
            provider: formData.provider || null,
            department: formData.department || null,
            currency: formData.currency,
            ex_rate: formData.ex_rate ? parseFloat(formData.ex_rate) : 1.0,
            notes: formData.notes || null,
            quotation_url: attachmentUrl,
            status: 'pending',
          }])
          .select()
          .single();

        if (reqError) throw reqError;
        reqId = req.id;
        reqData = req;
      }

      // 2. Insert all line items
      const itemsPayload = lineItems
        .filter(li => li.description.trim())
        .map(li => ({
          requisition_id: reqId,
          item_id: li.item_id || null,
          description: li.description,
          qty: parseFloat(li.qty) || 1,
          unit_price: parseFloat(li.unit_price) || 0,
          dept_client: li.dept_client || null,
        }));

      if (itemsPayload.length > 0) {
        const { error: itemsError } = await supabase
          .from('purchase_requisition_items')
          .insert(itemsPayload);
        if (itemsError) throw itemsError;
      }

      onSuccess(reqData);
      onClose();
      // Reset form
      setFormData({ type: 'mexican', provider: '', department: '', currency: 'MXP', ex_rate: '', notes: '' });
      setLineItems([{ item_id: null, description: '', qty: 1, unit_price: '', dept_client: '', searchQuery: '', showDropdown: false }]);
      setAttachmentFile(null);
      setAttachmentPreview(null);
      setExistingAttachmentUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Error saving purchase request:', err);
      alert('Error al guardar la solicitud: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const subtotal = calculateSubtotal();
  const iva = subtotal * 0.08;
  const total = subtotal + iva;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20">
                <ShoppingCart className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {requisition ? `Editar Solicitud ${requisition.folio}` : 'Nueva Solicitud de Compra'}
                </h3>
                <p className="text-xs text-slate-500">
                  Almacén: <span className="text-slate-400 font-semibold">{requisition?.inventories?.name || inventoryName}</span>
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-6 space-y-6">

              {/* Datos generales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo de Proveedor</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-violet-500 transition-colors"
                  >
                    <option value="mexican">Proveedor Mexicano (MXP)</option>
                    <option value="american">Proveedor Americano (USD)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Moneda</label>
                  <select
                    value={formData.currency}
                    onChange={e => setFormData(p => ({ ...p, currency: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-violet-500 transition-colors"
                  >
                    <option value="MXP">MXP – Peso Mexicano</option>
                    <option value="USD">USD – Dólar Americano</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Proveedor</label>
                  <input
                    type="text"
                    value={formData.provider}
                    onChange={e => setFormData(p => ({ ...p, provider: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-violet-500 transition-colors"
                    placeholder="Nombre del proveedor..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Departamento</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={e => setFormData(p => ({ ...p, department: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-violet-500 transition-colors"
                    placeholder="Ej: Mantenimiento, Producción..."
                  />
                </div>
                {formData.type === 'american' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo de Cambio (EX Rate)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.ex_rate}
                      onChange={e => setFormData(p => ({ ...p, ex_rate: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-violet-500 transition-colors"
                      placeholder="Ej: 17.50"
                    />
                  </div>
                )}
              </div>

              {/* Artículos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Package className="w-3.5 h-3.5" /> Artículos a Solicitar
                  </h4>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="flex items-center gap-1.5 text-xs font-bold text-violet-400 hover:text-violet-300 bg-violet-400/10 hover:bg-violet-400/20 px-3 py-1.5 rounded-lg transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Artículo
                  </button>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
                  <div className="col-span-4">Descripción / Artículo</div>
                  <div className="col-span-2 text-center">Cantidad</div>
                  <div className="col-span-2 text-center">Precio Unit.</div>
                  <div className="col-span-3">Depto / Cliente</div>
                  <div className="col-span-1"></div>
                </div>

                <div className="space-y-2">
                  {lineItems.map((lineItem, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-start group">
                      {/* Description with inventory search */}
                      <div className="col-span-4 relative">
                        <input
                          type="text"
                          value={lineItem.searchQuery || lineItem.description}
                          onChange={e => {
                            updateLineItem(index, 'searchQuery', e.target.value);
                            updateLineItem(index, 'description', e.target.value);
                            updateLineItem(index, 'item_id', null);
                            updateLineItem(index, 'showDropdown', true);
                          }}
                          onFocus={() => updateLineItem(index, 'showDropdown', true)}
                          onBlur={() => setTimeout(() => updateLineItem(index, 'showDropdown', false), 150)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-white focus:border-violet-500 transition-colors"
                          placeholder="Buscar o escribir artículo..."
                          required
                        />
                        {lineItem.showDropdown && (
                          <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                            {getFilteredItems(lineItem.searchQuery || '').map(item => (
                              <button
                                key={item.id}
                                type="button"
                                onMouseDown={() => selectInventoryItem(index, item)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-800 transition-colors"
                              >
                                <Package className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <div>
                                  <p className="text-slate-200 font-medium">{item.name}</p>
                                  {item.part_number && <p className="text-slate-500 text-xs font-mono">{item.part_number}</p>}
                                </div>
                              </button>
                            ))}
                            {inventoryItems.length === 0 && (
                              <p className="px-3 py-2 text-xs text-slate-500 italic">No hay artículos en este almacén</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Qty */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={lineItem.qty}
                          onChange={e => updateLineItem(index, 'qty', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-white text-center focus:border-violet-500 transition-colors"
                          required
                        />
                      </div>

                      {/* Unit price */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={lineItem.unit_price}
                          onChange={e => updateLineItem(index, 'unit_price', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-white text-center focus:border-violet-500 transition-colors"
                          placeholder="0.00"
                        />
                      </div>

                      {/* Dept / Client */}
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={lineItem.dept_client}
                          onChange={e => updateLineItem(index, 'dept_client', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-white focus:border-violet-500 transition-colors"
                          placeholder="Depto. o Cliente"
                        />
                      </div>

                      {/* Remove */}
                      <div className="col-span-1 flex justify-center pt-1">
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-4 ml-auto w-full max-w-xs space-y-1.5 bg-slate-950/30 p-4 rounded-2xl border border-slate-800/60">
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono text-slate-300">{formData.currency} ${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>IVA 8%:</span>
                    <span className="font-mono text-slate-300">{formData.currency} ${iva.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white border-t border-slate-700 pt-1.5 mt-1.5">
                    <span>Total:</span>
                    <span className="font-mono text-violet-400">{formData.currency} ${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Notas / Justificación</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-violet-500 transition-colors resize-none"
                  placeholder="Motivo de la solicitud, urgencia, especificaciones adicionales..."
                />
              </div>

              {/* Image / File Attachment */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Image className="w-3.5 h-3.5" /> Imagen / Adjunto de Justificación
                </label>

                {/* Show existing or newly selected attachment */}
                {(attachmentPreview || existingAttachmentUrl) ? (
                  <div className="relative group rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
                    {attachmentPreview ? (
                      <img src={attachmentPreview} alt="Vista previa" className="w-full max-h-52 object-contain" />
                    ) : (
                      // Existing URL – could be image or PDF
                      existingAttachmentUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(existingAttachmentUrl) ? (
                        <img src={existingAttachmentUrl} alt="Adjunto actual" className="w-full max-h-52 object-contain" />
                      ) : (
                        <div className="flex items-center gap-3 p-4">
                          <FileCheck className="w-8 h-8 text-violet-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-300 font-medium truncate">Archivo adjunto existente</p>
                            <a href={existingAttachmentUrl} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 mt-0.5">
                              <ExternalLink className="w-3 h-3" /> Ver archivo
                            </a>
                          </div>
                        </div>
                      )
                    )}
                    <div className="absolute top-2 right-2 flex gap-2">
                      {existingAttachmentUrl && !attachmentFile && (
                        <a href={existingAttachmentUrl} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 bg-slate-900/80 hover:bg-slate-800 rounded-lg text-violet-400 transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button type="button" onClick={removeAttachment}
                        className="p-1.5 bg-slate-900/80 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {attachmentFile && (
                      <div className="absolute bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-sm px-3 py-1.5">
                        <p className="text-xs text-slate-400 truncate">📎 {attachmentFile.name}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Drop zone */
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-700 hover:border-violet-500/60 rounded-2xl py-8 flex flex-col items-center gap-3 text-slate-500 hover:text-slate-300 transition-all group bg-slate-950/40 hover:bg-violet-500/5"
                  >
                    <div className="p-3 bg-slate-800 group-hover:bg-violet-500/10 rounded-xl transition-colors">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold">Haz clic para subir una imagen o PDF</p>
                      <p className="text-xs text-slate-600 mt-0.5">JPG, PNG, WEBP, PDF – máx. 10 MB</p>
                    </div>
                  </button>
                )}

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Button to change file when one is already shown */}
                {(attachmentPreview || existingAttachmentUrl) && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1.5 transition-colors"
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> Cambiar archivo
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 flex gap-4 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-750 text-white rounded-2xl font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3.5 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-bold shadow-lg shadow-violet-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><ShoppingCart className="w-5 h-5" /> Enviar Solicitud</>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
