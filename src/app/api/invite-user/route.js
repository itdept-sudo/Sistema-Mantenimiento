import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios: email y role' }, { status: 400 });
    }

    // 1. Configurar Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true' || false, 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 2. Mapear nombres de roles
    const roleNames = {
      admin: 'Administrador',
      supervisor: 'Encargado / Supervisor',
      inventory: 'Gestor de Almacén e Inventario',
      technician: 'Técnico de Mantenimiento',
      employee: 'Empleado (Solo Reportar)'
    };
    const roleName = roleNames[role] || role;

    // 3. Obtener Base URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
      || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    // 4. Crear Contenido de Correo HTML
    const mailOptions = {
      from: `"MaintOps Pro" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Invitación a colaborar en MaintOps Pro: Rol ${roleName.toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #f8fafc; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background-color: #0f172a; padding: 30px; text-align: center; border-bottom: 4px solid #2563eb;">
            <h2 style="color: white; margin: 0; font-size: 24px; letter-spacing: 0.05em; font-weight: 800;">MAINTOPS PRO</h2>
            <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Gestión Inteligente de Mantenimiento</p>
          </div>
          
          <!-- Content Body -->
          <div style="padding: 40px 30px; background-color: white;">
            <p style="font-size: 16px; color: #334155; margin-top: 0; line-height: 1.6;">Hola,</p>
            <p style="font-size: 16px; color: #334155; line-height: 1.6;">Has sido dado de alta y pre-aprobado en el sistema **MaintOps Pro** con el rol de:</p>
            
            <div style="margin: 20px 0; padding: 15px 25px; background-color: #f1f5f9; border-left: 4px solid #2563eb; border-radius: 4px;">
              <span style="font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase; tracking-wider: 0.1em; display: block; margin-bottom: 2px;">Rol Asignado</span>
              <strong style="font-size: 18px; color: #0f172a;">${roleName}</strong>
            </div>

            <p style="font-size: 15px; color: #475569; line-height: 1.6; margin-top: 25px;">
              Para acceder por primera vez y activar tu cuenta, por favor inicia sesión utilizando tu cuenta corporativa de Google dando clic al siguiente botón:
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${baseUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Aceptar Invitación e Iniciar Sesión</a>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0;">
              *Nota: Para mantener la seguridad del sistema, deberás iniciar sesión únicamente utilizando el correo al que fue enviada esta invitación (${email}).
            </p>
          </div>
          
          <!-- Footer -->
          <div style="padding: 20px; text-align: center; background-color: #0f172a;">
            <p style="font-size: 11px; color: #64748b; margin: 0;">MaintOps Pro © ${new Date().getFullYear()} • Este correo se generó de forma automática, por favor no respondas a este mensaje.</p>
          </div>
        </div>
      `
    };

    // 5. Enviar el correo
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Invitación por correo enviada con éxito' });

  } catch (error) {
    console.error('Error enviando invitación:', error);
    return NextResponse.json({ error: 'Fallo al enviar correo de invitación', details: error.message }, { status: 500 });
  }
}
