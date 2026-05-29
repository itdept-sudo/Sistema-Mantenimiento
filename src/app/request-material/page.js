'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { 
  PlusCircle, 
  Upload, 
  Send, 
  CheckCircle2, 
  Building, 
  DollarSign,
  FileText,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RequestMaterialPage() {
  const { user, profile } = useAuth();
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdFolio, setCreatedFolio] = useState('');

  const [formData, setFormData] = useState({
    materialName: '',
    qty: 1,
    unitPrice: '',
    currency: 'MXP',
    inventoryId: '',
    justification: '',
    provider: '',
  });

  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    fetchInventories();
  }, []);

  const fetchInventories = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('inventories')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setInventories(data || []);
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, inventoryId: data[0].id.toString() }));
      }
    } catch (err) {
      console.error('Error fetching inventories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFileError('');
    if (!selectedFile) return;

    // Limit to 5MB
    if (selectedFile.size > 5 * 1024 * 1024) {
      setFileError('El archivo es demasiado grande (máximo 5MB).');
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.materialName.trim()) {
      alert('Ingresa el nombre del material.');
      return;
    }
    if (!formData.inventoryId) {
      alert('Selecciona un almacén de destino.');
      return;
    }

    setSubmitting(true);
    try {
      let quotationUrl = null;

      // 1. Upload quotation file if present
      if (file) {
        const fileExt = file.name.split('.').pop();
        const cleanedFileName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.]/g, '');
        const fileName = `quotations/${Date.now()}_${cleanedFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('machines')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('machines')
          .getPublicUrl(fileName);

        quotationUrl = publicUrl;
      }

      // 2. Insert purchase requisition
      const { data: req, error: reqError } = await supabase
        .from('purchase_requisitions')
        .insert([{
          inventory_id: parseInt(formData.inventoryId),
          requester_id: user?.id || null,
          type: formData.currency === 'USD' ? 'american' : 'mexican',
          provider: formData.provider || 'Sujeto a Cotización',
          department: profile?.role ? profile.role.toUpperCase() : 'PORTAL PUBLICO',
          currency: formData.currency,
          ex_rate: formData.currency === 'USD' ? 17.50 : 1.0, // Default exchange rate
          notes: formData.justification || 'Solicitud de material especial desde el portal público',
          status: 'pending',
          quotation_url: quotationUrl,
        }])
        .select()
        .single();

      if (reqError) throw reqError;

      // 3. Insert single line item into items table
      const { error: itemError } = await supabase
        .from('purchase_requisition_items')
        .insert([{
          requisition_id: req.id,
          item_id: null, // Null since it's not in the catalog
          qty: parseFloat(formData.qty) || 1,
          description: formData.materialName,
          unit_price: formData.unitPrice ? parseFloat(formData.unitPrice) : 0.00,
          dept_client: profile?.full_name || 'Solicitante'
        }]);

      if (itemError) throw itemError;

      setCreatedFolio(req.folio);
      setSuccess(true);
      setFormData({
        materialName: '',
        qty: 1,
        unitPrice: '',
        currency: 'MXP',
        inventoryId: inventories.length > 0 ? inventories[0].id.toString() : '',
        justification: '',
        provider: '',
      });
      setFile(null);
    } catch (err) {
      console.error('Error creating special request:', err);
      alert('Error al enviar la solicitud: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-600 rounded-2xl shadow-lg shadow-violet-900/20">
            <PlusCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white">Solicitar Material Especial</h1>
            <p className="text-slate-450 text-xs md:text-sm mt-0.5">Solicita insumos o repuestos que no existen en el catálogo actual.</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-12 flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="p-4 bg-emerald-500/10 text-emerald-450 rounded-full border border-emerald-500/20 animate-bounce">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-bold text-white">¡Solicitud Enviada!</h2>
              <p className="text-slate-400 text-sm max-w-md">
                Tu requerimiento de material ha sido registrado exitosamente con el Folio <strong className="text-violet-400 font-bold">{createdFolio}</strong>. 
                El departamento de compras revisará tu solicitud a la brevedad.
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="mt-6 px-6 py-3 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-2xl transition-all"
              >
                Nueva Solicitud
              </button>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-450 uppercase tracking-widest">Nombre / Descripción del Material</label>
                  <input
                    required
                    type="text"
                    value={formData.materialName}
                    onChange={e => setFormData(p => ({ ...p, materialName: e.target.value }))}
                    placeholder="Ej: Banda de transmisión dentada 5VX800"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-450 uppercase tracking-widest">Cantidad Solicitada</label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.qty}
                    onChange={e => setFormData(p => ({ ...p, qty: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-450 uppercase tracking-widest">Almacén Destino</label>
                  {loading ? (
                    <div className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 px-4 text-xs text-slate-500">
                      Cargando almacenes...
                    </div>
                  ) : (
                    <select
                      value={formData.inventoryId}
                      onChange={e => setFormData(p => ({ ...p, inventoryId: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-500 transition-colors"
                    >
                      {inventories.map(inv => (
                        <option key={inv.id} value={inv.id}>{inv.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> Precio Unitario (Est.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unitPrice}
                    onChange={e => setFormData(p => ({ ...p, unitPrice: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-450 uppercase tracking-widest">Moneda</label>
                  <select
                    value={formData.currency}
                    onChange={e => setFormData(p => ({ ...p, currency: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-500 transition-colors"
                  >
                    <option value="MXP">MXP – Peso Mexicano</option>
                    <option value="USD">USD – Dólar Americano</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-450 uppercase tracking-widest">Proveedor Sugerido (Opcional)</label>
                  <input
                    type="text"
                    value={formData.provider}
                    onChange={e => setFormData(p => ({ ...p, provider: e.target.value }))}
                    placeholder="Ej: Grainger, McMaster-Carr..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-450 uppercase tracking-widest">Justificación / Notas</label>
                  <textarea
                    required
                    rows={3}
                    value={formData.justification}
                    onChange={e => setFormData(p => ({ ...p, justification: e.target.value }))}
                    placeholder="Describe por qué es necesario comprar este material y en qué máquina o departamento se utilizará..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-500 transition-colors resize-none"
                  />
                </div>

                {/* File upload field */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> Adjuntar Cotización / Ficha (Opcional)
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-800 border-dashed rounded-xl cursor-pointer bg-slate-950 hover:bg-slate-900/50 hover:border-violet-500/50 transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 text-slate-500 mb-2" />
                        <p className="text-xs text-slate-400 font-semibold">
                          {file ? file.name : 'Haz clic para seleccionar un archivo'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">PDF, PNG, JPG (máximo 5MB)</p>
                      </div>
                      <input 
                        type="file" 
                        accept=".pdf,.png,.jpg,.jpeg" 
                        className="hidden" 
                        onChange={handleFileChange} 
                      />
                    </label>
                  </div>
                  {fileError && (
                    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3" /> {fileError}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white rounded-2xl font-bold transition-all shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Send className="w-4 h-4" /> Enviar Solicitud</>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
