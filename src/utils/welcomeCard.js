const Canvas = require('canvas');

async function createWelcomeCard(userName, userAvatarUrl) {
    const canvas = Canvas.createCanvas(800, 400);
    const ctx = canvas.getContext('2d');

    // خلفية أنيقة
    ctx.fillStyle = '#1e1e2f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // حدود زخرفية
    ctx.strokeStyle = '#ef233c';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    // تحميل الصورة
    let avatarImage;
    try {
        avatarImage = await Canvas.loadImage(userAvatarUrl);
    } catch (err) {
        // صورة أستا الافتراضية
        avatarImage = await Canvas.loadImage('https://i.pinimg.com/736x/87/40/67/87406790d9b4b0eb1a719d363297a7a5.jpg');
    }

    // رسم الصورة بشكل دائري
    ctx.save();
    ctx.beginPath();
    ctx.arc(400, 150, 80, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImage, 320, 70, 160, 160);
    ctx.restore();

    // إضافة إطار للصورة
    ctx.beginPath();
    ctx.arc(400, 150, 80, 0, Math.PI * 2, true);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ef233c';
    ctx.stroke();

    // النصوص
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 45px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('مرحباً بك في المجموعة!', 400, 290);

    ctx.fillStyle = '#ef233c';
    ctx.font = 'bold 35px sans-serif';
    ctx.fillText(userName || 'صديق جديد', 400, 345);

    return canvas.toBuffer('image/png');
}

module.exports = { createWelcomeCard };
