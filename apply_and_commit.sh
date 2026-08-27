#!/usr/bin/env bash
# =============================================================================
# apply_and_commit.sh
#
# يطبّق تحديثات أستا على مستودعك المحلي، ويعمل commit منفصل ومنظّم لكل
# ملف/ميزة/إصلاح، برسائل واضحة بالإنجليزية، بترتيب منطقي:
#   1) البنية التحتية (config, db, responses)
#   2) إصلاح الأخطاء (Railway/Canvas, anime/news)
#   3) الميزات الجديدة (games, group admin, stickers, marriage, developer)
#   4) التوثيق (README)
#
# ملاحظة مهمة: هذا السكربت لا يزوّر تواريخ الكوميتات (GIT_AUTHOR_DATE /
# GIT_COMMITTER_DATE). كل كوميت يأخذ التاريخ والوقت الحقيقيين لحظة تشغيله،
# لأن تلفيق سجل تطوير لم يحدث فعلياً غير مضمون هنا. إذا رغبت أن تبدو
# الكوميتات موزّعة على فترة أطول، شغّل هذا السكربت على دفعات حقيقية
# (مثلاً قسم من التعديلات اليوم، والباقي غداً) بدل تزييف الطابع الزمني.
#
# الاستخدام:
#   1) انسخ هذا الملف إلى جذر مستودع مشروعك (بجانب .git)
#   2) تأكد أن كل الملفات المذكورة أدناه موجودة بمساراتها الصحيحة
#   3) شغّل: bash apply_and_commit.sh
# =============================================================================

set -e

if [ ! -d ".git" ]; then
  echo "❌ لم يتم العثور على مستودع git في المجلد الحالي. شغّل هذا السكربت من جذر مشروعك."
  exit 1
fi

commit_file() {
  local file="$1"
  local message="$2"
  if [ -e "$file" ]; then
    git add "$file"
    if ! git diff --cached --quiet; then
      git commit -m "$message"
      echo "✅ Committed: $file"
    else
      echo "⏭️  No changes for: $file (skipped)"
    fi
  else
    echo "⚠️  File not found, skipping: $file"
  fi
}

echo "🍀 بدء تطبيق تحديثات أستا..."
echo ""

# --- 1) البنية التحتية ---
commit_file "src/responses.json" \
  "feat(core): add responses.json for centralized, editable bot replies"

commit_file "src/utils/responses.js" \
  "feat(core): add loader utility for responses.json with variable interpolation"

commit_file "src/config.js" \
  "feat(config): add multi-owner support, self-execution flag, and default prefix change to '.'"

commit_file "src/database/db.js" \
  "feat(db): add banned_users table and ban/unban/isBanned helpers"

echo ""
echo "--- 2) إصلاح الأخطاء ---"

commit_file "nixpacks.toml" \
  "fix(deploy): add Railway Nixpacks config to install canvas native dependencies (cairo, pango, giflib)"

commit_file "src/commands/animeNews.js" \
  "fix(anime): make fetchJSON resilient with timeout, redirect handling, and 429 retry"

commit_file ".env.example" \
  "chore(config): update .env.example with new prefix and owner-related variables"

echo ""
echo "--- 3) الميزات الجديدة ---"

commit_file "src/handlers/commandHandler.js" \
  "feat(commands): register all new commands, add success auto-reaction (🤖), and ban gate"

commit_file "src/handlers/messageHandler.js" \
  "feat(messages): support self-number auto command execution and route text to active game answers"

commit_file "src/commands/games.js" \
  "feat(games): expand trivia bank, capture answers directly from chat, add letter-scramble group event with scoreboard"

commit_file "src/commands/groupAdmin.js" \
  "feat(group-admin): add ban/unban commands, hidden mention commands, and auto admin-promotion requests"

commit_file "src/commands/sticker.js" \
  "feat(sticker): support caption-triggered stickers, video/GIF stickers, and a sticker-steal command"

commit_file "src/commands/fun.js" \
  "feat(marriage): split marriage command into zoj (male) and zoja (female) character pools"

commit_file "src/commands/developer.js" \
  "feat(developer): add contact-developer command"

commit_file "src/commands/admin.js" \
  "refactor(admin): route permission-denied replies through responses.json"

commit_file "src/commands/owner.js" \
  "refactor(owner): support multi-owner list and route denial message through responses.json"

commit_file "src/commands/info.js" \
  "docs(help): update in-bot help menu with new commands"

echo ""
echo "--- 4) التوثيق ---"

commit_file "README.md" \
  "docs(readme): rewrite README with full feature list, developer section, and updated setup guide"

echo ""
echo "🎉 انتهى! كل التعديلات المتوفرة أصبحت commits منفصلة ومنظمة."
echo "راجع السجل عبر: git log --oneline"
