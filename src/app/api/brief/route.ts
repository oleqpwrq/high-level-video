export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// получатель и адрес отправителя
const MAIL_TO = process.env.MAIL_TO || "oleq.prok@yandex.ru";
const MAIL_FROM = process.env.MAIL_FROM || "High Level Video <no-reply@highlevel.video>";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, company, email, phone, message } = body || {};

    // простая валидация
    if (!name || !phone) {
      return NextResponse.json({ ok: false, error: "name/phone required" }, { status: 400 });
    }

    const subject = `Новая заявка — ${name}${company ? ` (${company})` : ""}`;
    const html = `
      <h2>Новая заявка с сайта</h2>
      <p><b>Имя:</b> ${escapeHtml(name)}</p>
      <p><b>Компания:</b> ${escapeHtml(company || "-")}</p>
      <p><b>Email:</b> ${escapeHtml(email || "-")}</p>
      <p><b>Телефон:</b> ${escapeHtml(phone)}</p>
      <p><b>Сообщение:</b><br/>${escapeHtml(message || "-").replace(/\\n/g, "<br/>")}</p>
      <hr/>
      <p style="color:#888">Отправлено автоматически с highlevelvideo</p>
    `;

    await resend.emails.send({
      from: MAIL_FROM,
      to: MAIL_TO,
      subject,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
