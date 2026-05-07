import { supabase } from '@/lib/supabase';

export const checkAndGenerateSchedules = async () => {
  if (!supabase) return;
  
  try {
    const now = new Date().toISOString();
    // Buscamos programaciones activas que ya vencieron
    const { data: pendingSchedules } = await supabase
      .from('maintenance_schedules')
      .select('*')
      .eq('is_active', true)
      .lte('next_due', now);

    if (pendingSchedules && pendingSchedules.length > 0) {
      console.log(`Procesando ${pendingSchedules.length} mantenimientos preventivos...`);
      let ordersGenerated = false;

      for (const schedule of pendingSchedules) {
        const newOrders = (schedule.machine_ids || []).map(mId => ({
          machine_id: mId,
          technician_id: schedule.technician_id,
          description: `[PREVENTIVO] ${schedule.title}: ${schedule.task_description}`,
          priority: 'medium',
          maintenance_type: 'preventive',
          status: 'open'
        }));

        if (newOrders.length > 0) {
          const { error: orderError } = await supabase
            .from('work_orders')
            .insert(newOrders);

          if (!orderError) {
            const nextDate = new Date(schedule.next_due);
            nextDate.setDate(nextDate.getDate() + schedule.interval_days);

            await supabase
              .from('maintenance_schedules')
              .update({ 
                last_performed: now,
                next_due: nextDate.toISOString()
              })
              .eq('id', schedule.id);
            
            ordersGenerated = true;
          } else {
            console.error("Error creating scheduled orders:", orderError);
          }
        }
      }
      return ordersGenerated;
    }
    return false;
  } catch (error) {
    console.error("Error al procesar preventivos:", error);
    return false;
  }
};
