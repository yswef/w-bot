const fs = require('fs');
const { getMessage, markDeleted } = require('../database/db');
const logger = require('../utils/logger');

/**
 * واتساب يبعث حدث "messages.update" مع protocolMessage من نوع REVOKE
 * لما شخص يسوي "حذف لدى الجميع". نلتقط هالحدث ونعيد إرسال النسخة المحفوظة عندنا.
 */
async function handleMessageUpdates(updates, sock) {
  for (const update of updates) {
    try {
      const { key, update: upd } = update;
      // كشف حدث الحذف (protocolMessage type 0 = REVOKE)
      const isRevoke =
        upd?.message === null ||
        upd?.messageStubType === 1 || // REVOKE في بعض إصدارات Baileys
        update?.update?.pollUpdates === undefined && upd?.message === null;

      if (!isRevoke) continue;

      const original = getMessage(key.id);
      if (!original) continue; // ما عندنا نسخة محفوظة، تجاهل

      markDeleted(key.id);

      const notice = `🗑️ *رسالة محذوفة* من ${original.sender_name}:\n\n${original.text_content || '(وسائط مرفقة)'}`;

      await sock.sendMessage(key.remoteJid, { text: notice });

      // لو فيه ملف وسائط محفوظ، نعيد إرساله كمان
      if (original.media_path && fs.existsSync(original.media_path)) {
        const type = original.message_type.replace('Message', '');
        const buffer = fs.readFileSync(original.media_path);
        if (type === 'image') await sock.sendMessage(key.remoteJid, { image: buffer });
        else if (type === 'video') await sock.sendMessage(key.remoteJid, { video: buffer });
        else if (type === 'audio') await sock.sendMessage(key.remoteJid, { audio: buffer });
        else if (type === 'sticker') await sock.sendMessage(key.remoteJid, { sticker: buffer });
      }

      logger.info(`تم اكتشاف حذف رسالة وإعادة إرسالها من ${original.sender_name}`);
    } catch (err) {
      logger.error('خطأ في معالج كشف الحذف: ' + err.message);
    }
  }
}

module.exports = handleMessageUpdates;
