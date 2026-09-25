declare const Deno: any;

/**
 * Low-level sender shared by every notification flavor (price-drop/target-met
 * alerts, purchase reminders, ...) — handles the Resend + Twilio plumbing and
 * the "only send if the relevant provider is configured" behavior once, so
 * each flavor just builds its own subject/html/whatsapp body.
 */
export async function sendEmailAndWhatsapp(
  userEmail: string,
  userWhatsapp: string | null,
  subject: string,
  html: string,
  whatsappBody: string
) {
  // 1. Resend Email Integration
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (resendKey && userEmail) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          // Falls back to Resend's default sender until willowwish.dev is
          // verified at resend.com/domains — switch back once it is.
          from: 'WillowWish <onboarding@resend.dev>',
          to: userEmail,
          subject,
          html,
        }),
      });
      console.log(`Resend response status: ${res.status}`);
    } catch (e) {
      console.error('Failed to send email notification:', e);
    }
  }

  // 2. Twilio WhatsApp Integration
  const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuth = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioFrom = Deno.env.get('TWILIO_WHATSAPP_FROM') || 'whatsapp:+14155238886';

  // Try user's metadata whatsapp first; fallback to TWILIO_WHATSAPP_TO
  const rawTo = userWhatsapp || Deno.env.get('TWILIO_WHATSAPP_TO');

  if (twilioSid && twilioAuth && rawTo) {
    try {
      const basicAuth = btoa(`${twilioSid}:${twilioAuth}`);

      // Format recipient: ensure it starts with "whatsapp:"
      const formattedTo = rawTo.startsWith('whatsapp:')
        ? rawTo
        : `whatsapp:${rawTo.startsWith('+') ? rawTo : '+' + rawTo}`;

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          From: twilioFrom,
          To: formattedTo,
          Body: whatsappBody,
        }),
      });
      console.log(`Twilio WhatsApp response status for ${formattedTo}: ${res.status}`);
    } catch (e) {
      console.error('Failed to send WhatsApp notification:', e);
    }
  }
}

/**
 * Send notification (email/whatsapp) when price drops or a target is met.
 */
export async function sendNotification(
  userEmail: string,
  userWhatsapp: string | null,
  itemName: string,
  oldPrice: number,
  newPrice: number,
  isTargetMet: boolean = false
) {
  const alertType = isTargetMet ? "🎯 Target Price Reached" : "🚨 Price Drop Alert";
  console.log(`[NOTIFICATION] ${alertType} for "${itemName}"! Notifying ${userEmail}. Old: ₹${oldPrice}, New: ₹${newPrice}`);

  const subject = isTargetMet
    ? `🎯 Target Met: ${itemName} is now ₹${newPrice}!`
    : `🚨 Price Dropped: ${itemName} is now ₹${newPrice}!`;

  const html = `
    <h3>${alertType}!</h3>
    <p>Your item <strong>${itemName}</strong> price changed:</p>
    <ul>
      <li>Previous Price: ₹${oldPrice}</li>
      <li><strong>New Price: ₹${newPrice}</strong></li>
    </ul>
    <p>Check it out now! <a href="https://willowwish.dev">Go to WillowWish</a></p>
  `;

  const whatsappBody = isTargetMet
    ? `🎯 Target Met: "${itemName}" reached your target price! It is now ₹${newPrice} (was ₹${oldPrice}).`
    : `🚨 Price Drop: "${itemName}" dropped from ₹${oldPrice} to ₹${newPrice}!`;

  await sendEmailAndWhatsapp(userEmail, userWhatsapp, subject, html, whatsappBody);
}

/**
 * Send a "time to buy" purchase reminder (email/whatsapp) for an item whose
 * target_purchase_date has arrived.
 */
export async function sendReminderNotification(
  userEmail: string,
  userWhatsapp: string | null,
  itemName: string,
  currentPrice: number | null
) {
  console.log(`[REMINDER] Purchase reminder for "${itemName}"! Notifying ${userEmail}.`);

  const priceLine = currentPrice != null ? ` It's currently ₹${currentPrice}.` : '';

  const subject = `⏰ Reminder: time to buy ${itemName}!`;
  const html = `
    <h3>⏰ Purchase Reminder</h3>
    <p>You asked us to remind you to buy <strong>${itemName}</strong> around now.${priceLine}</p>
    <p><a href="https://willowwish.dev">Go to WillowWish</a></p>
  `;
  const whatsappBody = `⏰ Reminder: it's time to buy "${itemName}"!${priceLine}`;

  await sendEmailAndWhatsapp(userEmail, userWhatsapp, subject, html, whatsappBody);
}
