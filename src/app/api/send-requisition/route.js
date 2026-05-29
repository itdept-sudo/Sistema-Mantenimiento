import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const body = await request.json();
    const { toEmails, subject, pdfBase64, folio, requesterName, inventoryName } = body;

    if (!toEmails || !pdfBase64 || !folio) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true' || false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const emailList = toEmails.split(',').map(e => e.trim()).filter(Boolean).join(', ');

    const mailOptions = {
      from: `"MaintOps Pro – Compras" <${process.env.SMTP_USER}>`,
      to: emailList,
      subject: subject || `Requisición de Compra ${folio} – Pendiente de Aprobación`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #f8fafc;">
          <div style="background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 28px 32px; text-align: center;">
            <h2 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">Requisición de Orden de Compra</h2>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Folio: <strong>${folio}</strong></p>
          </div>
          
          <div style="padding: 32px; background-color: white;">
            <p style="font-size: 16px; color: #334155; margin-top: 0;">Estimado(a),</p>
            <p style="font-size: 15px; color: #334155;">
              Se ha generado una nueva Requisición de Compra que requiere su aprobación. 
              El documento adjunto contiene todos los detalles de los artículos solicitados.
            </p>
            
            <div style="margin: 24px 0; background: #f1f5f9; border-radius: 10px; padding: 20px; border-left: 4px solid #3b82f6;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 600; width: 40%;">Folio:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-size: 13px; font-weight: 700;">${folio}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 600;">Solicitado por:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-size: 13px;">${requesterName || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 600;">Almacén:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-size: 13px;">${inventoryName || 'N/A'}</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 14px; color: #64748b;">
              Por favor revise el documento adjunto y notifique al área de compras sobre la aprobación o rechazo de esta solicitud.
            </p>
            
            <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                Este correo fue generado automáticamente por <strong>MaintOps Pro</strong>. Por favor no responda directamente a este mensaje.
              </p>
            </div>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Requisicion-${folio}.pdf`,
          content: pdfBase64,
          encoding: 'base64',
          contentType: 'application/pdf',
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: `Requisición enviada a: ${emailList}` });
  } catch (error) {
    console.error('Error sending requisition email:', error);
    return NextResponse.json({ error: error.message || 'Error al enviar el correo' }, { status: 500 });
  }
}
