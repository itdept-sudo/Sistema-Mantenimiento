import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Inicializar supabase para backend (necesita anon key o service role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { technicianId, orderId, machineName, priority, description, maintenanceType } = body;

    if (!technicianId || !orderId) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios' }, { status: 400 });
    }

    // 1. Obtener el email y nombre del técnico
    const { data: techData, error: techError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', technicianId)
      .single();

    if (techError || !techData || !techData.email) {
      return NextResponse.json({ error: 'Técnico no encontrado o sin email' }, { status: 404 });
    }

    // 2. Configurar el transporter de Nodemailer
    // Por defecto usa SMTP para Gmail/Google Workspace, pero se puede configurar por .env
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true' || false, 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Colores de prioridad para el email
    const priorityColors = {
      urgent: '#EF4444', // Red
      high: '#F97316',   // Orange
      medium: '#3B82F6', // Blue
      low: '#64748B'     // Slate
    };
    const color = priorityColors[priority] || '#3B82F6';

    // 3. Crear el contenido del correo (HTML)
    const mailOptions = {
      from: `"MaintOps Pro" <${process.env.SMTP_USER}>`,
      to: techData.email,
      subject: `Nueva Orden Asignada: ${machineName} (Prioridad ${priority.toUpperCase()})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #f8fafc;">
          <div style="background-color: ${color}; padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0; font-size: 24px;">Nueva Tarea Asignada</h2>
          </div>
          
          <div style="padding: 30px; background-color: white;">
            <p style="font-size: 16px; color: #334155; margin-top: 0;">Hola <strong>${techData.full_name}</strong>,</p>
            <p style="font-size: 16px; color: #334155;">Se te ha asignado una nueva orden de trabajo en <strong>MaintOps Pro</strong>. Por favor, atiende este reporte lo antes posible.</p>
            
            <div style="margin: 25px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 15px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 35%; color: #475569;">Máquina/Área</td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: bold;">${machineName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Orden ID</td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-family: monospace;">${orderId.slice(0,8)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Prioridad</td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; color: ${color}; font-weight: bold; text-transform: uppercase;">${priority}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Tipo</td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; color: #0f172a; text-transform: capitalize;">${maintenanceType || 'Correctivo'}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; background-color: #f1f5f9; font-weight: bold; color: #475569;">Descripción</td>
                  <td style="padding: 12px 15px; color: #0f172a; font-style: italic;">"${description}"</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/my-tasks" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Ver Mis Tareas</a>
            </div>
          </div>
          
          <div style="padding: 15px; text-align: center; background-color: #1e293b;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">Este es un mensaje automático de MaintOps Pro. Por favor no respondas a este correo.</p>
          </div>
        </div>
      `
    };

    // 4. Enviar correo
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Notificación enviada con éxito' });

  } catch (error) {
    console.error('Error enviando email:', error);
    return NextResponse.json({ error: 'Fallo al enviar notificación', details: error.message }, { status: 500 });
  }
}
