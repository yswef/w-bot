const { getLastSeen, getCachedCharacterImage, setCachedCharacterImage } = require('../database/db');
const logger = require('../utils/logger');

// شخصيات بلاك كلوفر - روابط صور ثابتة موثوقة (لا تعتمد على أي API خارجي)
const blackCloverMales = [
  { name: 'أستا (Asta)', searchName: 'Asta', image: 'https://i.pinimg.com/736x/87/40/67/87406790d9b4b0eb1a719d363297a7a5.jpg', universe: 'blackclover', quote: 'لا أملك سحراً لكن أملك إرادة لا تنكسر! ⚔️' },
  { name: 'يامي سوكيهيرو (Yami)', searchName: 'Yami Sukehiro', image: 'https://i.pinimg.com/736x/43/66/dc/4366dcce596fc8eb3ddedae34f6ba6df.jpg', universe: 'blackclover', quote: 'القوة الحقيقية تأتي من الهدوء قبل العاصفة 🖤' },
  { name: 'يونو (Yuno)', searchName: 'Yuno Grinberryall', image: 'https://i.pinimg.com/736x/d6/f1/b7/d6f1b7d5e49eeebfceca8ccaf745a96f.jpg', universe: 'blackclover', quote: 'الريح تحمل حلمي نحو القمة 🌪️' },
  { name: 'جوليوس (Julius)', searchName: 'Julius Novachrono', image: 'https://i.pinimg.com/736x/67/cc/d6/67ccd6abec7e928236d90a6e3cefe18c.jpg', universe: 'blackclover', quote: 'التضحية من أجل الآخرين هي أسمى أنواع السحر ✨' },
  { name: 'فينرال (Finral)', searchName: 'Finral Roulacase', image: 'https://i.pinimg.com/736x/0a/63/06/0a630623ec67a30ff16e3eb39dc75ee1.jpg', universe: 'blackclover', quote: 'حتى أبسط الأبواب قد تقود لأعظم الفرص 🌀' },

  { name: 'ماجنا سوينغ (Magna)', searchName: 'Magna Swing', universe: 'blackclover', anime: 'Black Clover', quote: 'انفجاراتي تتحدث قبل لساني! 💥' },
  { name: 'لاك فولتيا (Luck)', searchName: 'Luck Voltia', universe: 'blackclover', anime: 'Black Clover', quote: 'المخاطرة هي التوابل الحقيقية للمعركة ⚡' },
  { name: 'غوش أدلاي (Gauche)', searchName: 'Gauche Adlai', universe: 'blackclover', anime: 'Black Clover', quote: 'كل ما أفعله هو من أجل أختي فقط 🪞' },
  { name: 'زورا إيديال (Zora)', searchName: 'Zora Ideale', universe: 'blackclover', anime: 'Black Clover', quote: 'الفارس الحقيقي هو من يحمي الضعيف لا من يتباهى 🎭' },
  { name: 'نوزيل سيلفا (Nozel)', searchName: 'Nozel Silva', universe: 'blackclover', anime: 'Black Clover', quote: 'الفخر لا يعني التخلي عن العائلة 🦅' },
  { name: 'فويغوليون فيرميليون (Fuegoleon)', searchName: 'Fuegoleon Vermillion', universe: 'blackclover', anime: 'Black Clover', quote: 'النار التي تحمي أقوى من النار التي تحرق 🔥' },
  { name: 'ويليام فانجينس (William)', searchName: 'William Vangeance', universe: 'blackclover', anime: 'Black Clover', quote: 'حتى الأشجار تحتاج جذوراً عميقة لتصمد 🌳' },
  { name: 'ناخت فاوست (Nacht)', searchName: 'Nacht Faust', universe: 'blackclover', anime: 'Black Clover', quote: 'الظلام ليس عدواً، بل أداة بيد من يتقنه 🌑' },
  { name: 'كلاوس لونيت (Klaus)', searchName: 'Klaus Lunettes', universe: 'blackclover', anime: 'Black Clover', quote: 'الانضباط هو السحر الذي لا يخذل أحداً 📏' },
  { name: 'ليوبولد فيرميليون (Leopold)', searchName: 'Leopold Vermillion', universe: 'blackclover', anime: 'Black Clover', quote: 'سأشتعل حتى أصل لمستوى أخي! 🔥' },
  { name: 'لانغريس فود (Langris)', searchName: 'Langris Vaude', universe: 'blackclover', anime: 'Black Clover', quote: 'تعلمت أن القوة بلا احترام مجرد ضجيج 🌀' },
  { name: 'غوردون أغريبا (Gordon)', searchName: 'Gordon Agrippa', universe: 'blackclover', anime: 'Black Clover', quote: 'الأصدقاء الحقيقيون يسمعونك حتى لو همست 💀' },
  { name: 'هنري ليجولانت (Henry)', searchName: 'Henry Legolant', universe: 'blackclover', anime: 'Black Clover', quote: 'البطء لا يعني الضعف، بل التحمّل 🏚️' },
  { name: 'زينون زوغراتيس (Zenon)', searchName: 'Zenon Zogratis', universe: 'blackclover', anime: 'Black Clover', quote: 'العظام لا تكذب أبداً 🦴' },
];

const blackCloverFemales = [
  { name: 'نويلي سيلفا (Noelle)', searchName: 'Noelle Silva', image: 'https://i.pinimg.com/736x/21/df/b6/21dfb6ba4f1c1fce727289569ed9aeb5.jpg', universe: 'blackclover', quote: 'لم أعد تلك الفتاة الضعيفة، أنا الآن فارسة الماء 🌊' },
  { name: 'ميريليونا (Mereoleona)', searchName: 'Mereoleona Vermillion', image: 'https://i.pinimg.com/736x/01/a0/0c/01a00cc91866ff3428d000cd23a544f8.jpg', universe: 'blackclover', quote: 'القوة تُصقل بالنار لا بالراحة 🔥' },
  { name: 'فانيسا (Vanessa)', searchName: 'Vanessa Enoteca', image: 'https://i.pinimg.com/736x/95/9b/38/959b380feecfb6cdd2e08df2b9442ef5.jpg', universe: 'blackclover', quote: 'الحياة كلها قماشة، وأنا أرسم قدري بنفسي 🧵' },
  { name: 'تشارمي (Charmy)', searchName: 'Charmy Pappitson', image: 'https://i.pinimg.com/736x/ff/15/48/ff1548e6db966beab75083ece49efac9.jpg', universe: 'blackclover', quote: 'أفضل طريق للقلب يمر عبر معدة ممتلئة 🍞' },

  { name: 'ميموزا فيرميليون (Mimosa)', searchName: 'Mimosa Vermillion', universe: 'blackclover', anime: 'Black Clover', quote: 'الشفاء فن، والرحمة أقوى أسلحتي 🌷' },
  { name: 'سيكري سوالوتيل (Secre)', searchName: 'Secre Swallowtail', universe: 'blackclover', anime: 'Black Clover', quote: 'الوفاء لا تنتهي صلاحيته عبر القرون 🔒' },
  { name: 'شارلوت روزلي (Charlotte)', searchName: 'Charlotte Roselei', universe: 'blackclover', anime: 'Black Clover', quote: 'الأشواك تحمي الوردة، وأنا أحمي من أحب 🌹' },
  { name: 'غراي (Grey)', searchName: 'Grey', universe: 'blackclover', anime: 'Black Clover', quote: 'لست ضعيفة، أنا فقط أختار متى أظهر قوتي 🎨' },
  { name: 'دوروثي أونسوورث (Dorothy)', searchName: 'Dorothy Unsworth', universe: 'blackclover', anime: 'Black Clover', quote: 'في عالم الأحلام، أنا من يضع القواعد 💤' },
  { name: 'سول ماري (Sol)', searchName: 'Sol Marron', universe: 'blackclover', anime: 'Black Clover', quote: 'النساء لا يحتجن إذناً ليصبحن أقوى 🗿' },
  { name: 'ريبيكا سكارليت (Rebecca)', searchName: 'Rebecca Scarlet', universe: 'blackclover', anime: 'Black Clover', quote: 'الحياة صعبة، لكن الابتسامة مجانية 🍀' },
  { name: 'نيرو (Nero)', searchName: 'Nero', universe: 'blackclover', anime: 'Black Clover', quote: 'الصمت الطويل يخفي أعظم الأسرار 🐦' },
  { name: 'سيستر ليلي (Sister Lily)', searchName: 'Lily Aquaria', universe: 'blackclover', anime: 'Black Clover', quote: 'الإيمان أقوى من أي سحر ⛪' },
  { name: 'فانيكا زوغراتيس (Vanica)', searchName: 'Vanica Zogratis', universe: 'blackclover', anime: 'Black Clover', quote: 'لا شيء يثير حماسي مثل خصم لا يستسلم 🩸' },
];

// شخصيات من أنميات أخرى — الصور تُجلب تلقائياً من AniList عبر الاسم الكامل
// الدقيق (searchName) مع التحقق من تطابق الاسم لتفادي عرض شخصية خاطئة،
// وتُخزَّن بشكل دائم في قاعدة البيانات بعد أول مرة.
const otherAnimeMales = [
  { name: 'ناروتو (Naruto)', searchName: 'Naruto Uzumaki', universe: 'other', anime: 'Naruto', quote: 'لن أتراجع عن كلمتي، فهذا طريق النينجا الخاص بي! 🍥' },
  { name: 'ساسكي (Sasuke)', searchName: 'Sasuke Uchiha', universe: 'other', anime: 'Naruto', quote: 'القوة وحدها لا تكفي دون هدف واضح ⚡' },
  { name: 'كاكاشي (Kakashi)', searchName: 'Kakashi Hatake', universe: 'other', anime: 'Naruto', quote: 'من يخالف القوانين حثالة، ومن يتخلى عن رفاقه أسوأ من الحثالة 📖' },
  { name: 'إيتاتشي (Itachi)', searchName: 'Itachi Uchiha', universe: 'other', anime: 'Naruto', quote: 'لا تحكم على أحد من مظهره، بل من قلبه 🌙' },
  { name: 'غارا (Gaara)', searchName: 'Gaara', universe: 'other', anime: 'Naruto', quote: 'وجدت معنى وجودي حين بدأت أحمي غيري 🏜️' },
  { name: 'جيرايا (Jiraiya)', searchName: 'Jiraiya', universe: 'other', anime: 'Naruto', quote: 'البطل الحقيقي هو من يصنع أبطالاً بعده 🐸' },
  { name: 'مادارا (Madara)', searchName: 'Madara Uchiha', universe: 'other', anime: 'Naruto', quote: 'استيقظ للواقع، فالحياة معركة لا تنتهي 🌑' },
  { name: 'لوفي (Luffy)', searchName: 'Monkey D. Luffy', universe: 'other', anime: 'One Piece', quote: 'سأصبح ملك القراصنة، هذا قراري ولن يتغير! 🏴‍☠️' },
  { name: 'زورو (Zoro)', searchName: 'Roronoa Zoro', universe: 'other', anime: 'One Piece', quote: 'الطريق للقمة مليء بالسقوط، لكنني لن أتراجع أبداً ⚔️' },
  { name: 'سانجي (Sanji)', searchName: 'Sanji', universe: 'other', anime: 'One Piece', quote: 'لا أركل بقدمي فقط، بل بكل مبادئي 🔥' },
  { name: 'إيس (Ace)', searchName: 'Portgas D. Ace', universe: 'other', anime: 'One Piece', quote: 'أريد فقط أن يتذكرني العالم بأنني عشت 🔥' },
  { name: 'لو (Law)', searchName: 'Trafalgar Law', universe: 'other', anime: 'One Piece', quote: 'الفوضى أحياناً هي أدق خطة 💉' },
  { name: 'شانكس (Shanks)', searchName: 'Shanks', universe: 'other', anime: 'One Piece', quote: 'الوعد الذي تقطعه يساوي قيمتك كلها 🍶' },
  { name: 'غوكو (Goku)', searchName: 'Son Goku', universe: 'other', anime: 'Dragon Ball', quote: 'القتال ضد الأقوياء هو ما يجعلني أشعر بأنني حي! 🔥' },
  { name: 'فيجيتا (Vegeta)', searchName: 'Vegeta', universe: 'other', anime: 'Dragon Ball', quote: 'الكبرياء لا يعني الغرور، بل رفض الاستسلام 👑' },
  { name: 'غوهان (Gohan)', searchName: 'Son Gohan', universe: 'other', anime: 'Dragon Ball', quote: 'الغضب بلا سيطرة ضعف، والهدوء قوة 💪' },
  { name: 'إيتشيغو (Ichigo)', searchName: 'Ichigo Kurosaki', universe: 'other', anime: 'Bleach', quote: 'سأحمي من أحب مهما كلفني الأمر 🗡️' },
  { name: 'بياكويا (Byakuya)', searchName: 'Byakuya Kuchiki', universe: 'other', anime: 'Bleach', quote: 'الكرامة لا تُمنح، بل تُنتزع بالانضباط 🌸' },
  { name: 'كينباتشي (Kenpachi)', searchName: 'Kenpachi Zaraki', universe: 'other', anime: 'Bleach', quote: 'المتعة الحقيقية في خصم لا يسقط بسهولة ⚔️' },
  { name: 'أيزن (Aizen)', searchName: 'Sousuke Aizen', universe: 'other', anime: 'Bleach', quote: 'من يقف في القمة وحده لا يرى إلا السماء 🕶️' },
  { name: 'ناتسو (Natsu)', searchName: 'Natsu Dragneel', universe: 'other', anime: 'Fairy Tail', quote: 'طالما ناري مشتعلة، لن أستسلم أبداً 🔥' },
  { name: 'غراي (Gray)', searchName: 'Gray Fullbuster', universe: 'other', anime: 'Fairy Tail', quote: 'الجليد يحمي كما يجرح، والأمر يعود لي ❄️' },
  { name: 'لاكسوس (Laxus)', searchName: 'Laxus Dreyar', universe: 'other', anime: 'Fairy Tail', quote: 'العائلة ليست دماً فقط، بل من يقف معك 🌩️' },
  { name: 'إيرين (Eren)', searchName: 'Eren Yeager', universe: 'other', anime: 'Attack on Titan', quote: 'سأقاتل حتى أحرر نفسي من هذا القفص 🗡️' },
  { name: 'ليفاي (Levi)', searchName: 'Levi Ackerman', universe: 'other', anime: 'Attack on Titan', quote: 'اختر بحكمة، فلا وقت للندم لاحقاً 🖤' },
  { name: 'أرمين (Armin)', searchName: 'Armin Arlert', universe: 'other', anime: 'Attack on Titan', quote: 'من لا يضحي بشيء لا يغيّر شيئاً 🌊' },
  { name: 'تانجيرو (Tanjiro)', searchName: 'Tanjiro Kamado', universe: 'other', anime: 'Demon Slayer', quote: 'سأحمي عائلتي مهما حدث، هذا قسمي 🌊' },
  { name: 'زينيتسو (Zenitsu)', searchName: 'Zenitsu Agatsuma', universe: 'other', anime: 'Demon Slayer', quote: 'الخوف لا يمنع الشجاعة، بل يصنعها ⚡' },
  { name: 'إينوسكي (Inosuke)', searchName: 'Inosuke Hashibira', universe: 'other', anime: 'Demon Slayer', quote: 'اندفع أولاً وفكّر لاحقاً! 🐗' },
  { name: 'رينغوكو (Rengoku)', searchName: 'Kyojuro Rengoku', universe: 'other', anime: 'Demon Slayer', quote: 'أشعل قلبك! هذا واجب من يحمل السيف 🔥' },
  { name: 'غيو (Giyu)', searchName: 'Giyu Tomioka', universe: 'other', anime: 'Demon Slayer', quote: 'الهدوء هو أسرع الطرق إلى الضربة الصحيحة 🌊' },
  { name: 'ميدوريا (Izuku)', searchName: 'Izuku Midoriya', universe: 'other', anime: 'My Hero Academia', quote: 'يمكنك أن تصبح بطلاً حتى لو بدأت من الصفر 💚' },
  { name: 'باكوغو (Bakugo)', searchName: 'Katsuki Bakugo', universe: 'other', anime: 'My Hero Academia', quote: 'الفوز ليس كافياً، يجب أن يكون الأفضل 💥' },
  { name: 'تودوروكي (Shoto)', searchName: 'Shoto Todoroki', universe: 'other', anime: 'My Hero Academia', quote: 'قوتي ملكي أنا، وليست إرث أحد 🔥❄️' },
  { name: 'أول مايت (All Might)', searchName: 'All Might', universe: 'other', anime: 'My Hero Academia', quote: 'لا بأس الآن، لأنني هنا! 💪' },
  { name: 'غوجو (Gojo)', searchName: 'Satoru Gojo', universe: 'other', anime: 'Jujutsu Kaisen', quote: 'الأقوى لا يشك في نفسه أبداً 🕶️' },
  { name: 'يوجي إيتادوري (Yuji)', searchName: 'Yuji Itadori', universe: 'other', anime: 'Jujutsu Kaisen', quote: 'أريد أن يموت الناس بطريقة صحيحة 👊' },
  { name: 'ميغومي (Megumi)', searchName: 'Megumi Fushiguro', universe: 'other', anime: 'Jujutsu Kaisen', quote: 'أنقذ من أراه يستحق، هذه عدالتي 🐕' },
  { name: 'نانامي (Nanami)', searchName: 'Kento Nanami', universe: 'other', anime: 'Jujutsu Kaisen', quote: 'العمل الجاد لا يخون صاحبه أبداً 🕴️' },
  { name: 'كيلوا (Killua)', searchName: 'Killua Zoldyck', universe: 'other', anime: 'Hunter x Hunter', quote: 'الصديق الحقيقي يستحق أن أتخلى عن ماضيي ⚡' },
  { name: 'غون (Gon)', searchName: 'Gon Freecss', universe: 'other', anime: 'Hunter x Hunter', quote: 'لن أتوقف حتى أحقق ما وعدت به نفسي 🎣' },
  { name: 'كورابيكا (Kurapika)', searchName: 'Kurapika', universe: 'other', anime: 'Hunter x Hunter', quote: 'الغضب المنظم أخطر من الغضب الأعمى ⛓️' },
  { name: 'إدوارد (Edward Elric)', searchName: 'Edward Elric', universe: 'other', anime: 'Fullmetal Alchemist', quote: 'لكل شيء تكافؤ، وثمن النهوض يستحق الألم ⚙️' },
  { name: 'ألفونس (Alphonse)', searchName: 'Alphonse Elric', universe: 'other', anime: 'Fullmetal Alchemist', quote: 'الجسد يتغير لكن القلب يبقى كما هو 🛡️' },
  { name: 'روي مستانغ (Roy Mustang)', searchName: 'Roy Mustang', universe: 'other', anime: 'Fullmetal Alchemist', quote: 'النار تحت السيطرة تُنير، وخارجها تُدمّر 🔥' },
  { name: 'سايتاما (Saitama)', searchName: 'Saitama', universe: 'other', anime: 'One Punch Man', quote: 'تدرّب حتى تتجاوز حدودك، ثم تجاوزها مرة أخرى 👊' },
  { name: 'جينوس (Genos)', searchName: 'Genos', universe: 'other', anime: 'One Punch Man', quote: 'التلميذ الحقيقي يتعلم من كل هزيمة 🤖' },
  { name: 'كيريتو (Kirito)', searchName: 'Kirito', universe: 'other', anime: 'Sword Art Online', quote: 'اللعبة انتهت حين تختار أن تكون حقيقياً ⚔️' },
  { name: 'دينجي (Denji)', searchName: 'Denji', universe: 'other', anime: 'Chainsaw Man', quote: 'أحلامي بسيطة، لكنني أقاتل من أجلها بجنون 🔗' },
  { name: 'سينكو (Senku)', searchName: 'Senku Ishigami', universe: 'other', anime: 'Dr. Stone', quote: 'العلم لا يخذل من يؤمن به 🧪' },
  { name: 'ريمورو (Rimuru)', searchName: 'Rimuru Tempest', universe: 'other', anime: 'Tensei Shitara Slime Datta Ken', quote: 'القوة الحقيقية أن تصنع مكاناً يعيش فيه الجميع بسلام 💧' },
  { name: 'ميليوداس (Meliodas)', searchName: 'Meliodas', universe: 'other', anime: 'Nanatsu no Taizai', quote: 'لن أدع أحداً يمس أصدقائي، أبداً ⚔️' },
  { name: 'ثورفين (Thorfinn)', searchName: 'Thorfinn', universe: 'other', anime: 'Vinland Saga', quote: 'ليس لي أعداء، هذا ما تعلمته بعد كل ذلك الدم 🌾' },
  { name: 'لويد فورجر (Loid)', searchName: 'Loid Forger', universe: 'other', anime: 'Spy x Family', quote: 'أحياناً تصبح المهمة عائلة حقيقية 🕵️' },
  { name: 'شينرا (Shinra)', searchName: 'Shinra Kusakabe', universe: 'other', anime: 'Enen no Shouboutai', quote: 'سأصبح البطل الذي ينقذ الجميع من اللهب 🔥' },
  { name: 'هيناتا شويو (Hinata Shoyo)', searchName: 'Shouyou Hinata', universe: 'other', anime: 'Haikyuu!!', quote: 'القصر لا يعني الضعف، بل قفزة أعلى 🏐' },
  { name: 'كاجياما (Kageyama)', searchName: 'Tobio Kageyama', universe: 'other', anime: 'Haikyuu!!', quote: 'الفريق يصنع البطل، لا العكس 🏐' },
];

const otherAnimeFemales = [
  { name: 'ساكورا (Sakura)', searchName: 'Sakura Haruno', universe: 'other', anime: 'Naruto', quote: 'الشفاء أيضاً نوع من أنواع القوة 🌸' },
  { name: 'هيناتا (Hinata)', searchName: 'Hinata Hyuga', universe: 'other', anime: 'Naruto', quote: 'الخطوة الصغيرة بثقة أفضل من الوقوف بالمكان 🌸' },
  { name: 'تسونادي (Tsunade)', searchName: 'Tsunade', universe: 'other', anime: 'Naruto', quote: 'القيادة تعني أن تحمل ألم الجميع 💪' },
  { name: 'تيماري (Temari)', searchName: 'Temari', universe: 'other', anime: 'Naruto', quote: 'الرياح لا تسأل أحداً أين تهب 🍃' },
  { name: 'إينو (Ino)', searchName: 'Ino Yamanaka', universe: 'other', anime: 'Naruto', quote: 'الجمال والقوة ليسا ضدين 🌼' },
  { name: 'كونان (Konan)', searchName: 'Konan', universe: 'other', anime: 'Naruto', quote: 'الورق الهش قد يصبح جناحاً يحملك 📄' },
  { name: 'نامي (Nami)', searchName: 'Nami', universe: 'other', anime: 'One Piece', quote: 'خريطتي إلى الحرية ترسمها يدي وحدها 🗺️' },
  { name: 'نيكو روبن (Robin)', searchName: 'Nico Robin', universe: 'other', anime: 'One Piece', quote: 'أردت فقط أن أعيش، وهذا أشجع قرار اتخذته 📚' },
  { name: 'بوا هانكوك (Hancock)', searchName: 'Boa Hancock', universe: 'other', anime: 'One Piece', quote: 'القوة والجمال معاً سلاح لا يُقاوم 🐍' },
  { name: 'فيفي (Vivi)', searchName: 'Nefertari Vivi', universe: 'other', anime: 'One Piece', quote: 'سأحمي بلدي حتى آخر نفس 🏜️' },
  { name: 'بولما (Bulma)', searchName: 'Bulma', universe: 'other', anime: 'Dragon Ball', quote: 'العقل يصنع ما لا تصنعه العضلات 🔧' },
  { name: 'أندرويد 18', searchName: 'Android 18', universe: 'other', anime: 'Dragon Ball', quote: 'الهدوء أحياناً أقوى من أي انفجار 💠' },
  { name: 'روكيا (Rukia)', searchName: 'Rukia Kuchiki', universe: 'other', anime: 'Bleach', quote: 'الواجب لا يمنع القلب من الشعور ❄️' },
  { name: 'أوريهيمي (Orihime)', searchName: 'Orihime Inoue', universe: 'other', anime: 'Bleach', quote: 'الرفض أن أستسلم هو سحري الخاص 🌺' },
  { name: 'يوروئيتشي (Yoruichi)', searchName: 'Yoruichi Shihouin', universe: 'other', anime: 'Bleach', quote: 'السرعة ليست هرباً، بل خياراً ذكياً 🐈' },
  { name: 'رانغيكو (Rangiku)', searchName: 'Rangiku Matsumoto', universe: 'other', anime: 'Bleach', quote: 'خلف كل ابتسامة قصة لا يعرفها أحد 🍶' },
  { name: 'إيرزا (Erza)', searchName: 'Erza Scarlet', universe: 'other', anime: 'Fairy Tail', quote: 'قوّي داخلك أولاً، فالدروع لا تحمي قلباً هشاً ⚔️' },
  { name: 'لوسي (Lucy)', searchName: 'Lucy Heartfilia', universe: 'other', anime: 'Fairy Tail', quote: 'الصداقة الحقيقية أقوى من أي سحر ✨' },
  { name: 'جوفيا (Juvia)', searchName: 'Juvia Lockser', universe: 'other', anime: 'Fairy Tail', quote: 'حتى المطر يتوقف حين يجد من يحبه ☔' },
  { name: 'ويندي (Wendy)', searchName: 'Wendy Marvell', universe: 'other', anime: 'Fairy Tail', quote: 'الصغر في السن لا يعني الصغر في القلب 🌪️' },
  { name: 'ميراجين (Mirajane)', searchName: 'Mirajane Strauss', universe: 'other', anime: 'Fairy Tail', quote: 'اللطف لا يتعارض مع القوة إطلاقاً 😇' },
  { name: 'ميكاسا (Mikasa)', searchName: 'Mikasa Ackerman', universe: 'other', anime: 'Attack on Titan', quote: 'العالم قاسٍ، لكن من أحبهم يستحقون كل قوتي 🗡️' },
  { name: 'هيستوريا (Historia)', searchName: 'Historia Reiss', universe: 'other', anime: 'Attack on Titan', quote: 'اخترت أن أكون نفسي، لا ما يريدونه 👑' },
  { name: 'ساشا (Sasha)', searchName: 'Sasha Blouse', universe: 'other', anime: 'Attack on Titan', quote: 'حتى في أصعب الأيام، ابحث عن سبب لتبتسم 🥔' },
  { name: 'هانجي (Hange)', searchName: 'Hange Zoe', universe: 'other', anime: 'Attack on Titan', quote: 'الفضول هو أول خطوة نحو الحرية 🔬' },
  { name: 'نيزوكو (Nezuko)', searchName: 'Nezuko Kamado', universe: 'other', anime: 'Demon Slayer', quote: 'حتى في أحلك الظروف، يبقى الحب سبب صمودي 🌸' },
  { name: 'شينوبو (Shinobu)', searchName: 'Shinobu Kocho', universe: 'other', anime: 'Demon Slayer', quote: 'الابتسامة قد تكون أقوى درع 🦋' },
  { name: 'ميتسوري (Mitsuri)', searchName: 'Mitsuri Kanroji', universe: 'other', anime: 'Demon Slayer', quote: 'الحب طاقة، وأنا أقاتل به 💗' },
  { name: 'كاناو (Kanao)', searchName: 'Kanao Tsuyuri', universe: 'other', anime: 'Demon Slayer', quote: 'تعلمت أن أختار بقلبي لا بعملة معدنية 🦋' },
  { name: 'أوتشاكو (Ochaco)', searchName: 'Ochaco Uraraka', universe: 'other', anime: 'My Hero Academia', quote: 'سأرتقي بجهدي الخاص، خطوة بخطوة 💪' },
  { name: 'موموه ياويوروزو (Momo)', searchName: 'Momo Yaoyorozu', universe: 'other', anime: 'My Hero Academia', quote: 'المعرفة أعظم ما يمكن أن تصنعه 📘' },
  { name: 'تسويو (Tsuyu)', searchName: 'Tsuyu Asui', universe: 'other', anime: 'My Hero Academia', quote: 'قول الحقيقة بهدوء أفضل من الصراخ 🐸' },
  { name: 'نوبارا (Nobara)', searchName: 'Nobara Kugisaki', universe: 'other', anime: 'Jujutsu Kaisen', quote: 'أحب نفسي كما أنا، وهذه قوتي 🔨' },
  { name: 'ماكي (Maki)', searchName: 'Maki Zenin', universe: 'other', anime: 'Jujutsu Kaisen', quote: 'لا أحتاج موهبة، أحتاج إصراراً فقط 👓' },
  { name: 'وينري (Winry)', searchName: 'Winry Rockbell', universe: 'other', anime: 'Fullmetal Alchemist', quote: 'أصلح ما تكسّر، وأمنح الأمل شكلاً جديداً 🔧' },
  { name: 'ريزا هوكاي (Riza)', searchName: 'Riza Hawkeye', universe: 'other', anime: 'Fullmetal Alchemist', quote: 'الولاء يعني أن تحمي أحلام من تثق به 🎯' },
  { name: 'أسونا (Asuna)', searchName: 'Asuna Yuuki', universe: 'other', anime: 'Sword Art Online', quote: 'لن أنتظر أن يُنقذني أحد، سأقاتل بنفسي ⚔️' },
  { name: 'ريم (Rem)', searchName: 'Rem', universe: 'other', anime: 'Re:Zero', quote: 'من الصفر نبدأ، ومن الحب نكمل 💙' },
  { name: 'إيميليا (Emilia)', searchName: 'Emilia', universe: 'other', anime: 'Re:Zero', quote: 'العدل يبدأ من أن تنظر للجميع بعين واحدة ❄️' },
  { name: 'ميغومين (Megumin)', searchName: 'Megumin', universe: 'other', anime: 'KonoSuba', quote: 'الانفجار فن، والفن لا يُشرح! 💥' },
  { name: 'يور فورجر (Yor)', searchName: 'Yor Forger', universe: 'other', anime: 'Spy x Family', quote: 'أحمي عائلتي بطريقتي الخاصة 🌹' },
  { name: 'آنيا فورجر (Anya)', searchName: 'Anya Forger', universe: 'other', anime: 'Spy x Family', quote: 'واكوواكو! المغامرة تبدأ الآن 🥜' },
  { name: 'ماكيما (Makima)', searchName: 'Makima', universe: 'other', anime: 'Chainsaw Man', quote: 'السيطرة تبدأ من فهم ما يريده الآخرون 🔗' },
  { name: 'باور (Power)', searchName: 'Power', universe: 'other', anime: 'Chainsaw Man', quote: 'أنا الأقوى! ولا تجادلني في ذلك 🩸' },
  { name: 'زيرو تو (Zero Two)', searchName: 'Zero Two', universe: 'other', anime: 'Darling in the Franxx', quote: 'أريد أن أكون معك حتى النهاية 💗' },
  { name: 'كوريسو (Kurisu)', searchName: 'Kurisu Makise', universe: 'other', anime: 'Steins;Gate', quote: 'العلم لا يلغي المشاعر، بل يفسرها 🧠' },
  { name: 'فايوليت (Violet)', searchName: 'Violet Evergarden', universe: 'other', anime: 'Violet Evergarden', quote: 'أتعلم معنى الحب كلمة بكلمة 💌' },
  { name: 'كاوري (Kaori)', searchName: 'Kaori Miyazono', universe: 'other', anime: 'Shigatsu wa Kimi no Uso', quote: 'اعزف بقلبك ليصل صوتك للجميع 🎻' },
  { name: 'ماي ساكوراجيما (Mai)', searchName: 'Mai Sakurajima', universe: 'other', anime: 'Seishun Buta Yarou', quote: 'أن يراك أحدهم حقاً هو أجمل شعور 🐰' },
  { name: 'كاغويا (Kaguya)', searchName: 'Kaguya Shinomiya', universe: 'other', anime: 'Kaguya-sama wa Kokurasetai', quote: 'الحب حرب، والفائز من يعترف أولاً 💭' },
  { name: 'تشيكا (Chika)', searchName: 'Chika Fujiwara', universe: 'other', anime: 'Kaguya-sama wa Kokurasetai', quote: 'البهجة أيضاً مهارة تحتاج تدريباً 🎶' },
  { name: 'مارين كيتاغاوا (Marin)', searchName: 'Marin Kitagawa', universe: 'other', anime: 'Sono Bisque Doll wa Koi wo Suru', quote: 'أحب ما أحب بصوت عالٍ ولا أعتذر 🎀' },
  { name: 'رافتاليا (Raphtalia)', searchName: 'Raphtalia', universe: 'other', anime: 'Tate no Yuusha no Nariagari', quote: 'السيف الذي يثق بحامله لا ينكسر 🗡️' },
  { name: 'كاغومي (Kagome)', searchName: 'Kagome Higurashi', universe: 'other', anime: 'InuYasha', quote: 'بين عالمين، اخترت أن أقاتل من أجل من أحب ✨' },
  { name: 'ميساكا ميكوتو (Mikoto)', searchName: 'Mikoto Misaka', universe: 'other', anime: 'Toaru Kagaku no Railgun', quote: 'الكهرباء في يدي، والقرار في قلبي ⚡' },
];

// القوائم الكاملة المستخدمة في أوامر .زوج/.زوجة/.انمي
const maleCharacters = [...blackCloverMales, ...otherAnimeMales];
const femaleCharacters = [...blackCloverFemales, ...otherAnimeFemales];
const allCharacters = [...maleCharacters, ...femaleCharacters];

function getRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// تطبيع النص للمقارنة (إزالة حالة الأحرف والرموز الزائدة) لفحص تطابق الأسماء
function normalizeForCompare(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// ⚠️ إصلاح حرج: البحث بالاسم الحر عبر API خارجي قد يُرجع شخصية مختلفة
// تماماً بسبب تشابه الحروف (مثال حقيقي واجهناه: طلب "Lucy" أرجع صورة
// "Luffy" لتشابه الإملاء!). قبل قبول أي نتيجة، نتحقق أن الاسم الذي
// أرجعته الـ API فعلاً يطابق (أو يحتوي) الاسم الذي بحثنا عنه، وإلا
// نرفضها تماماً بدل عرض صورة خاطئة لشخصية أخرى.
function namesReasonablyMatch(searched, returned) {
  const a = normalizeForCompare(searched);
  const b = normalizeForCompare(returned);
  if (!a || !b) return false;
  const aWords = a.split(' ').filter((w) => w.length > 2);
  const bWords = new Set(b.split(' ').filter((w) => w.length > 2));
  // يكفي أن تتطابق كلمة واحدة مهمة (مثل الاسم الأول أو اسم العائلة)
  return aWords.some((w) => bWords.has(w));
}

// ذاكرة تخزين مؤقت داخل الجلسة الحالية (طبقة أولى أسرع من قاعدة البيانات)
const characterImageCache = new Map();

// ⚠️ إصلاح: كنا نعتمد على Jikan API وتبيّن عدم استقراره (أخطاء 502/503/504
// متكررة من استضافة Railway). الآن نستخدم AniList (أكثر استقراراً)، مع
// التحقق من صحة تطابق الاسم قبل القبول (انظر namesReasonablyMatch)، ونُخزّن
// كل نتيجة ناجحة بشكل دائم في قاعدة البيانات فلا تُطلب الشخصية مرتين أبداً.
async function getCharacterImageUrl(searchName) {
  if (characterImageCache.has(searchName)) {
    return characterImageCache.get(searchName);
  }

  const dbCached = getCachedCharacterImage(searchName);
  if (dbCached !== undefined) {
    characterImageCache.set(searchName, dbCached);
    return dbCached; // قد تكون null (بحث سابق فاشل) أو رابط صورة حقيقي
  }

  const attempt = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          query: `query ($search: String) { Character(search: $search) { name { full } image { large } } }`,
          variables: { search: searchName },
        }),
      });
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.statusCode = res.status;
        throw err;
      }
      const data = await res.json();
      const character = data?.data?.Character;
      if (!character?.image?.large) return null;
      if (!namesReasonablyMatch(searchName, character.name?.full)) {
        logger.warn(`تجاهل نتيجة غير مطابقة: بحثنا عن "${searchName}" فأرجعت API اسم "${character.name?.full}"`);
        return null;
      }
      return character.image.large;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  let url = null;
  try {
    url = await attempt();
  } catch (err) {
    if ([429, 500, 502, 503, 504].includes(err.statusCode)) {
      await new Promise((r) => setTimeout(r, 1200));
      try {
        url = await attempt();
      } catch (err2) {
        logger.warn(`فشل جلب صورة الشخصية "${searchName}" من AniList بعد إعادة المحاولة: ${err2.message}`);
      }
    } else {
      logger.warn(`فشل جلب صورة الشخصية "${searchName}" من AniList: ${err.message}`);
    }
  }

  characterImageCache.set(searchName, url);
  setCachedCharacterImage(searchName, url);
  return url;
}

// ⚠️ ميزة جديدة: تحميل وتخزين صور كل الشخصيات مسبقاً عند بدء تشغيل البوت
// (وليس عند أول طلب من مستخدم)، حتى تكون الأوامر سريعة وموثوقة من أول
// استخدام. تُنادى مرة واحدة بعد نجاح الاتصال بواتساب، ولا توقف عمل
// البوت أثناء انتظارها (تعمل في الخلفية). المهلة بين كل طلب والذي يليه
// (1.2 ثانية) تحترم حدود معدل طلبات AniList.
async function warmupCharacterImages() {
  const toFetch = allCharacters.filter((c) => !c.image); // فقط من لا يملك رابط صورة ثابت
  logger.info(`⏳ بدء تحميل مسبق لصور ${toFetch.length} شخصية أنمي...`);
  let success = 0;
  let failed = 0;
  for (const character of toFetch) {
    try {
      const url = await getCharacterImageUrl(character.searchName);
      if (url) success += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
    await new Promise((r) => setTimeout(r, 1200)); // احترام حدود معدل الطلبات
  }
  logger.info(`✅ انتهى التحميل المسبق لصور الشخصيات: ${success} نجحت، ${failed} فشلت (ستُعاد المحاولة عند أول طلب فعلي لها).`);
}

async function fetchImageSafe(url) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/jpeg, image/png, image/webp'
      }
    });
    if (!res.ok) throw new Error('Bad status: ' + res.status);
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error('Not an image. Content-Type: ' + contentType);
    }
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > 5 * 1024 * 1024) throw new Error('Image too large (> 5MB)');
    return Buffer.from(buffer);
  } finally {
    clearTimeout(id);
  }
}

// يبني ويرسل نتيجة اختيار شخصية (مستخدَم في .زوج / .زوجة / .انمي)
async function sendCharacterResult(sock, msg, chatId, character, title) {
  const animeLine = character.anime ? `\n📺 من أنمي: *${character.anime}*` : '';
  const response = `${title}\n\n⚔️ *${character.name}* 🌸${animeLine}\n\n💬 ${character.quote}`;

  const imageUrl = character.image || (await getCharacterImageUrl(character.searchName));

  if (imageUrl) {
    try {
      const imgBuffer = await fetchImageSafe(imageUrl);
      await sock.sendMessage(chatId, { image: imgBuffer, caption: response }, { quoted: msg });
      return;
    } catch {
      try {
        // محاولة ثانية: نترك واتساب نفسه يجلب الصورة من الرابط مباشرة
        await sock.sendMessage(chatId, { image: { url: imageUrl }, caption: response }, { quoted: msg });
        return;
      } catch {
        await sock.sendMessage(chatId, { text: response + '\n\n*(تعذر تحميل الصورة هذه المرة 💥)*' }, { quoted: msg });
        return;
      }
    }
  }
  await sock.sendMessage(chatId, { text: response }, { quoted: msg });
}

module.exports = async function funCommand({ sock, msg, args, chatId, senderId, commandKey }) {
  // 🔎 .شخصية <اسم> — يبحث عن شخصية معيّنة داخل قائمة أستا
  if (commandKey === 'شخصية' || commandKey === 'character') {
    const query = args.join(' ').trim();
    if (!query) {
      await sock.sendMessage(chatId, {
        text: `🔎 اكتب اسم الشخصية بعد الأمر.\nمثال: \`.شخصية نويل\` أو \`.شخصية Levi\`\n\n📚 قائمة أستا تحتوي حالياً *${allCharacters.length}* شخصية.`,
      }, { quoted: msg });
      return;
    }
    const q = query.toLowerCase();
    const matches = allCharacters.filter(
      (c) => c.name.toLowerCase().includes(q) || c.searchName.toLowerCase().includes(q)
    );
    if (!matches.length) {
      await sock.sendMessage(chatId, { text: `😅 ما لقيت شخصية باسم "${query}" في قائمة أستا. جرّب اسماً آخر!` }, { quoted: msg });
      return;
    }
    if (matches.length > 1 && matches.length <= 12) {
      const list = matches.map((c, i) => `${i + 1}. ${c.name}${c.anime ? ` — ${c.anime}` : ''}`).join('\n');
      await sock.sendMessage(chatId, { text: `🔎 وجدت ${matches.length} نتيجة:\n\n${list}\n\nاكتب اسماً أدق لعرض الصورة.` }, { quoted: msg });
      return;
    }
    await sendCharacterResult(sock, msg, chatId, matches[0], '🔎 *نتيجة البحث*');
    return;
  }

  // 📚 .شخصيات — عدد الشخصيات المتاحة وتوزيعها
  if (commandKey === 'شخصيات' || commandKey === 'characters') {
    const bc = allCharacters.filter((c) => c.universe === 'blackclover').length;
    await sock.sendMessage(chatId, {
      text: `📚 *قائمة شخصيات أستا*\n\n` +
        `👥 الإجمالي: *${allCharacters.length}* شخصية\n` +
        `🍀 بلاك كلوفر: *${bc}*\n` +
        `🌍 أنميات أخرى: *${allCharacters.length - bc}*\n` +
        `♂️ ذكور: *${maleCharacters.length}* · ♀️ إناث: *${femaleCharacters.length}*\n\n` +
        `جرّب: \`.انمي\` · \`.زوج\` · \`.زوجة\` · \`.شخصية <اسم>\``,
    }, { quoted: msg });
    return;
  }

  if (commandKey === 'anime' || commandKey === 'انمي') {
    const character = getRandom(allCharacters);
    const title = character.universe === 'blackclover' ? '🌸 *مملكة كلوفر*' : '🌸 *عالم الأنمي*';
    await sendCharacterResult(sock, msg, chatId, character, `${title}\n\nشخصية الأنمي الخاصة بك اليوم:`);
    return;
  }

  if (commandKey === 'زوج') {
    const character = getRandom(maleCharacters);
    await sendCharacterResult(sock, msg, chatId, character, '💖 زوجك السحري هو:');
    return;
  }

  if (commandKey === 'زوجة') {
    const character = getRandom(femaleCharacters);
    await sendCharacterResult(sock, msg, chatId, character, '💖 زوجتك السحرية هي:');
    return;
  }

  if (commandKey === 'lastseen' || commandKey === 'آخر-مرة' || commandKey === 'آخرمرة') {
    const target = args[0] || senderId;
    const seen = getLastSeen(chatId, target);
    if (!seen) {
      await sock.sendMessage(chatId, { text: 'ℹ️ لا توجد بيانات لآخر مرة شوهدت فيها هذا الشخص.' }, { quoted: msg });
      return;
    }
    const date = new Date(seen.last_seen).toLocaleString('ar-SA');
    await sock.sendMessage(chatId, { text: `👀 آخر مرة شوهدت فيها ${target} كانت: ${date}` }, { quoted: msg });
  }
};

module.exports.warmupCharacterImages = warmupCharacterImages;
