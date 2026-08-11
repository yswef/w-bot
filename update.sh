#!/bin/bash
set -e

echo "[Asta Deploy] سحب آخر التحديثات - استا لن يستسلم!..."
git pull

echo "[Asta Deploy] تثبيت الحزم بسرعة وبثبات عبر npm ci..."
npm ci

echo "[Asta Deploy] إعادة تشغيل أستا..."
pm2 restart whatsapp-bot

echo "[Asta Deploy] اكتملت المهمة بنجاح!"
