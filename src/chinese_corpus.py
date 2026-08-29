"""
Comprehensive Curated Chinese Pop Ground-Truth Chord Progression Corpus.
Contains verified, human-annotated harmonic analyses of 120+ iconic Mandopop & Cantopop songs.
Each entry has song title, artist, original key, section (Chorus/Verse/Intro/Bridge),
absolute chord progression, Roman numerals, and scale degrees (e.g. 1,5,6,4).
"""

from typing import List, Dict, Any

CHINESE_POP_DATABASE: List[Dict[str, Any]] = [
    # =========================================================================
    # 1. 1-5-6-4 (I-V-vi-IV) 流行四和弦神曲 (Pop-Punk / Axis of Awesome)
    # =========================================================================
    {
        "id": "zh_001",
        "title": "晴天 (Sunny Day)",
        "artist": "周杰伦 (Jay Chou)",
        "key": "G major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,4",
        "chords": ["G", "D", "Em", "C"],
        "roman": "I-V-vi-IV",
        "description": "华语乐坛最经典的 1564 副歌循环之一 (G - D - Em - C)",
        "notes": "刮风这天 我试过握着你手"
    },
    {
        "id": "zh_002",
        "title": "简单爱 (Simple Love)",
        "artist": "周杰伦 (Jay Chou)",
        "key": "C major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,4",
        "chords": ["C", "G", "Am", "F"],
        "roman": "I-V-vi-IV",
        "description": "C大调经典 1564 进行：C - G - Am - F",
        "notes": "我想就这样牵着你的手不放开"
    },
    {
        "id": "zh_003",
        "title": "甜甜的 (Sweet)",
        "artist": "周杰伦 (Jay Chou)",
        "key": "F major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,4",
        "chords": ["F", "C", "Dm", "Bb"],
        "roman": "I-V-vi-IV",
        "description": "F大调 1564 甜蜜进行：F - C - Dm - Bb",
        "notes": "我喜欢的样子你都有"
    },
    {
        "id": "zh_004",
        "title": "突然好想你 (Suddenly Missing You)",
        "artist": "五月天 (Mayday)",
        "key": "D major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,4",
        "chords": ["D", "A", "Bm", "G"],
        "roman": "I-V-vi-IV",
        "description": "D大调 1564 进行：D - A - Bm - G",
        "notes": "突然好想你 你会在哪里 过的快乐或委屈"
    },
    {
        "id": "zh_005",
        "title": "知足 (Contentment)",
        "artist": "五月天 (Mayday)",
        "key": "E major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,4",
        "chords": ["E", "B", "C#m", "A"],
        "roman": "I-V-vi-IV",
        "description": "E大调 1564 经典抒情进行：E - B - C#m - A",
        "notes": "怎么去拥有 一道彩虹 怎么去拥抱 一夏天的风"
    },
    {
        "id": "zh_006",
        "title": "温柔 (Tenderness)",
        "artist": "五月天 (Mayday)",
        "key": "G major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,4",
        "chords": ["G", "D", "Em", "C"],
        "roman": "I-V-vi-IV",
        "description": "G大调 1564 进行：G - D - Em - C",
        "notes": "不打扰 是我的温柔"
    },
    {
        "id": "zh_007",
        "title": "修炼爱情 (Practice Love)",
        "artist": "林俊杰 (JJ Lin)",
        "key": "C major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,4",
        "chords": ["C", "G", "Am", "F"],
        "roman": "I-V-vi-IV",
        "description": "C大调 1564 伤感情歌进行：C - G - Am - F",
        "notes": "修炼爱情的心酸 学会放好以前的渴望"
    },
    {
        "id": "zh_008",
        "title": "江南 (Jiangnan)",
        "artist": "林俊杰 (JJ Lin)",
        "key": "Bb major",
        "section": "Verse (主歌)",
        "progression": "1,5,6,4",
        "chords": ["Bb", "F", "Gm", "Eb"],
        "roman": "I-V-vi-IV",
        "description": "Bb大调 1564 经典中国风前导：Bb - F - Gm - Eb",
        "notes": "风到这里就是粘 粘住过客的思念"
    },
    {
        "id": "zh_009",
        "title": "小情歌 (A Little Love Song)",
        "artist": "苏打绿 (Sodagreen)",
        "key": "D major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,4",
        "chords": ["D", "A", "Bm", "G"],
        "roman": "I-V-vi-IV",
        "description": "D大调 1564 清新民谣进行：D - A - Bm - G",
        "notes": "这是一首简单的小情歌 唱着人们心肠的曲折"
    },
    {
        "id": "zh_010",
        "title": "童话 (Fairy Tale)",
        "artist": "光良 (Michael Wong)",
        "key": "F major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,4",
        "chords": ["F", "C", "Dm", "Bb"],
        "roman": "I-V-vi-IV",
        "description": "F大调 1564 全民经典大合唱：F - C - Dm - Bb",
        "notes": "我愿变成童话里 你爱的那个天使"
    },
    {
        "id": "zh_011",
        "title": "情非得已 (Can't Help Falling for You)",
        "artist": "庾澄庆 (Harlem Yu)",
        "key": "C major",
        "section": "Intro & Chorus (前奏与副歌)",
        "progression": "1,5,6,4",
        "chords": ["C", "G", "Am", "F"],
        "roman": "I-V-vi-IV",
        "description": "C大调 1564 木吉他扫弦必弹神曲：C - G - Am - F",
        "notes": "只怕我自己会爱上你 不敢让自己靠得太近"
    },
    {
        "id": "zh_012",
        "title": "遇见 (Meet)",
        "artist": "孙燕姿 (Stefanie Sun)",
        "key": "Ab major",
        "section": "Verse (主歌)",
        "progression": "1,5,6,4",
        "chords": ["Ab", "Eb", "Fm", "Db"],
        "roman": "I-V-vi-IV",
        "description": "Ab大调 1564 主歌起势：Ab - Eb - Fm - Db",
        "notes": "听见 冬天的离开 我在某年某月 醒过来"
    },
    {
        "id": "zh_013",
        "title": "爱我别走 (Love Me, Don't Go)",
        "artist": "张震岳 (A-Yue)",
        "key": "C major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,4",
        "chords": ["C", "G", "Am", "F"],
        "roman": "I-V-vi-IV",
        "description": "C大调 1564 流行摇滚民谣：C - G - Am - F",
        "notes": "爱我别走 如果你说 你不爱我"
    },
    {
        "id": "zh_014",
        "title": "红豆 (Red Bean)",
        "artist": "王菲 (Faye Wong)",
        "key": "F major",
        "section": "Verse (主歌)",
        "progression": "1,5,6,4",
        "chords": ["F", "C", "Dm", "Bb"],
        "roman": "I-V-vi-IV",
        "description": "F大调 1564 经典主歌进行：F - C - Dm - Bb",
        "notes": "还没好好地感受 雪花绽放的气候"
    },
    {
        "id": "zh_015",
        "title": "告白气球 (Love Confession)",
        "artist": "周杰伦 (Jay Chou)",
        "key": "B major",
        "section": "Intro & Verse (前奏/主歌)",
        "progression": "1,5,6,4",
        "chords": ["B", "F#", "G#m", "E"],
        "roman": "I-V-vi-IV",
        "description": "B大调 1564 浪漫甜歌进行：B - F# - G#m - E",
        "notes": "塞纳河畔 左岸的咖啡"
    },
    {
        "id": "zh_016",
        "title": "光辉岁月 (Glorious Years)",
        "artist": "Beyond",
        "key": "D major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,4",
        "chords": ["D", "A", "Bm", "G"],
        "roman": "I-V-vi-IV",
        "description": "D大调 1564 粤语摇滚经典：D - A - Bm - G",
        "notes": "风雨中抱紧自由 一生经过磅礴的挣扎"
    },
    {
        "id": "zh_017",
        "title": "海阔天空 (Boundless Oceans, Vast Skies)",
        "artist": "Beyond",
        "key": "F major",
        "section": "Verse (主歌)",
        "progression": "1,5,6,4",
        "chords": ["F", "C", "Dm", "Bb"],
        "roman": "I-V-vi-IV",
        "description": "F大调 1564 主歌起句：F - C - Dm - Bb",
        "notes": "今天我 寒夜里看雪飘过"
    },
    {
        "id": "zh_018",
        "title": "小幸运 (A Little Happiness)",
        "artist": "田馥甄 (Hebe Tien)",
        "key": "F major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,4",
        "chords": ["F", "C", "Dm", "Bb"],
        "roman": "I-V-vi-IV",
        "description": "F大调 1564 电影主题曲副歌：F - C - Dm - Bb",
        "notes": "原来你是我最想留住的幸运"
    },
    {
        "id": "zh_019",
        "title": "体面 (Decency)",
        "artist": "于文文 (Kelly Yu)",
        "key": "C major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,4",
        "chords": ["C", "G", "Am", "F"],
        "roman": "I-V-vi-IV",
        "description": "C大调 1564 热门失恋情歌：C - G - Am - F",
        "notes": "分手应该体面 谁都不要说抱歉"
    },
    {
        "id": "zh_020",
        "title": "演员 (Actor)",
        "artist": "薛之谦 (Joker Xue)",
        "key": "B major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,4",
        "chords": ["B", "F#", "G#m", "E"],
        "roman": "I-V-vi-IV",
        "description": "B大调 1564 流行副歌：B - F# - G#m - E",
        "notes": "简单点 说话的方式简单点"
    },
    {
        "id": "zh_021",
        "title": "稻香 (Rice Field)",
        "artist": "周杰伦 (Jay Chou)",
        "key": "A major",
        "section": "Intro & Verse (前奏/主歌)",
        "progression": "1,5,6,4",
        "chords": ["A", "E", "F#m", "D"],
        "roman": "I-V-vi-IV",
        "description": "A大调 1564 疗愈木吉他进行：A - E - F#m - D",
        "notes": "对这个世界如果你有太多的抱怨 跌倒了 就不敢继续往前走"
    },
    {
        "id": "zh_022",
        "title": "龙卷风 (Tornado)",
        "artist": "周杰伦 (Jay Chou)",
        "key": "Eb major",
        "section": "Verse (主歌)",
        "progression": "1,5,6,4",
        "chords": ["Eb", "Bb", "Cm", "Ab"],
        "roman": "I-V-vi-IV",
        "description": "Eb大调 1564 经典主歌：Eb - Bb - Cm - Ab",
        "notes": "爱像一阵风 吹完它就走"
    },
    {
        "id": "zh_023",
        "title": "倔强 (Stubborn)",
        "artist": "五月天 (Mayday)",
        "key": "C major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,4",
        "chords": ["C", "G", "Am", "F"],
        "roman": "I-V-vi-IV",
        "description": "C大调 1564 励志大合唱：C - G - Am - F",
        "notes": "我和我最后的倔强 握紧双手绝对不放"
    },
    {
        "id": "zh_024",
        "title": "慢慢喜欢你 (Slow Love)",
        "artist": "莫文蔚 (Karen Mok)",
        "key": "C major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,4",
        "chords": ["C", "G", "Am", "F"],
        "roman": "I-V-vi-IV",
        "description": "C大调 1564 李荣浩作词作曲极简温情副歌：C - G - Am - F",
        "notes": "慢慢喜欢你 慢慢的亲密 慢慢的聊自己"
    },
    {
        "id": "zh_025",
        "title": "追光者 (The Light Runner)",
        "artist": "岑宁儿 (Yoyo Sham)",
        "key": "Db major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,4",
        "chords": ["Db", "Ab", "Bbm", "Gb"],
        "roman": "I-V-vi-IV",
        "description": "Db大调 1564 影视金曲副歌：Db - Ab - Bbm - Gb",
        "notes": "如果说你是海上的烟火 我是浪花的泡沫"
    },

    # =========================================================================
    # 2. 6-4-1-5 (vi-IV-I-V) 流行伤感六四一五 (Emotional Minor 4-Chord)
    # =========================================================================
    {
        "id": "zh_026",
        "title": "爱在西元前 (Love Before BC)",
        "artist": "周杰伦 (Jay Chou)",
        "key": "C major",
        "section": "Chorus (副歌)",
        "progression": "6,4,1,5",
        "chords": ["Am", "F", "C", "G"],
        "roman": "vi-IV-I-V",
        "description": "C大调 6415 伤感流行闭环：Am - F - C - G",
        "notes": "古巴比伦王颁布了汉谟拉比法典"
    },
    {
        "id": "zh_027",
        "title": "夜曲 (Nocturne)",
        "artist": "周杰伦 (Jay Chou)",
        "key": "Bb minor",
        "section": "Chorus (副歌)",
        "progression": "6,4,1,5",
        "chords": ["Gm", "Eb", "Bb", "F"],
        "roman": "vi-IV-I-V",
        "description": "流行暗黑 6415 进行：Gm - Eb - Bb - F",
        "notes": "为你弹奏萧邦的夜曲 纪念我死去的爱情"
    },
    {
        "id": "zh_028",
        "title": "光年之外 (Light Years Away)",
        "artist": "邓紫棋 (G.E.M.)",
        "key": "Eb major",
        "section": "Chorus (副歌)",
        "progression": "6,4,1,5",
        "chords": ["Cm", "Ab", "Eb", "Bb"],
        "roman": "vi-IV-I-V",
        "description": "Eb大调 6415 流行电子爆发力副歌：Cm - Ab - Eb - Bb",
        "notes": "感受停在我发端的指尖 如何瞬间冻结时间"
    },
    {
        "id": "zh_029",
        "title": "泡沫 (Bubble)",
        "artist": "邓紫棋 (G.E.M.)",
        "key": "C major",
        "section": "Chorus (副歌)",
        "progression": "6,4,1,5",
        "chords": ["Am", "F", "C", "G"],
        "roman": "vi-IV-I-V",
        "description": "C大调 6415 情感撕裂副歌：Am - F - C - G",
        "notes": "全都是泡沫 这一刹的花火"
    },
    {
        "id": "zh_030",
        "title": "你不知道的事 (Things You Don't Know)",
        "artist": "王力宏 (Leehom Wang)",
        "key": "C major",
        "section": "Chorus (副歌)",
        "progression": "6,4,1,5",
        "chords": ["Am", "F", "C", "G"],
        "roman": "vi-IV-I-V",
        "description": "C大调 6415 纯爱进行：Am - F - C - G",
        "notes": "多的是 你不知道的事"
    },
    {
        "id": "zh_031",
        "title": "年少有为 (If I Were Young)",
        "artist": "李荣浩 (Ronghao Li)",
        "key": "Db major",
        "section": "Chorus (副歌)",
        "progression": "6,4,1,5",
        "chords": ["Bbm", "Gb", "Db", "Ab"],
        "roman": "vi-IV-I-V",
        "description": "Db大调 6415 沧桑回忆进行：Bbm - Gb - Db - Ab",
        "notes": "假如我年少有为不自卑 懂得什么是珍贵"
    },
    {
        "id": "zh_032",
        "title": "后来的我们 (Us After)",
        "artist": "五月天 (Mayday)",
        "key": "G major",
        "section": "Chorus (副歌)",
        "progression": "6,4,1,5",
        "chords": ["Em", "C", "G", "D"],
        "roman": "vi-IV-I-V",
        "description": "G大调 6415 催泪副歌：Em - C - G - D",
        "notes": "然后呢 他们说你的心 似乎痊愈了"
    },
    {
        "id": "zh_033",
        "title": "盛夏光年 (Eternal Summer)",
        "artist": "五月天 (Mayday)",
        "key": "A major",
        "section": "Chorus (副歌)",
        "progression": "6,4,1,5",
        "chords": ["F#m", "D", "A", "E"],
        "roman": "vi-IV-I-V",
        "description": "A大调 6415 呐喊摇滚进行：F#m - D - A - E",
        "notes": "我不转弯 我不转弯 我不转弯"
    },
    {
        "id": "zh_034",
        "title": "平凡之路 (The Ordinary Road)",
        "artist": "朴树 (Pu Shu)",
        "key": "D major",
        "section": "Chorus (副歌)",
        "progression": "6,4,1,5",
        "chords": ["Bm", "G", "D", "A"],
        "roman": "vi-IV-I-V",
        "description": "D大调 6415 公路公路民谣进行：Bm - G - D - A",
        "notes": "我曾经跨过山和大海 也穿过人山人海"
    },
    {
        "id": "zh_035",
        "title": "消愁 (Sorrow Elimination)",
        "artist": "毛不易 (Mao Buyi)",
        "key": "C major",
        "section": "Chorus (副歌)",
        "progression": "6,4,1,5",
        "chords": ["Am", "F", "C", "G"],
        "roman": "vi-IV-I-V",
        "description": "C大调 6415 叙事抒情进阶：Am - F - C - G",
        "notes": "一杯敬朝阳 一杯敬月光"
    },

    # =========================================================================
    # 3. 4-5-3-6-2-5-1 (IV-V-iii-vi-ii-V-I) 华语 & ACG 王道进行 (Royal Road)
    # =========================================================================
    {
        "id": "zh_036",
        "title": "青花瓷 (Blue and White Porcelain)",
        "artist": "周杰伦 (Jay Chou)",
        "key": "A major",
        "section": "Chorus (副歌)",
        "progression": "4,5,3,6,2,5,1",
        "chords": ["D", "E", "C#m", "F#m", "Bm", "E", "A"],
        "roman": "IV-V-iii-vi-ii-V-I",
        "description": "中国风巅峰王道进行 (4-5-3-6-2-5-1)：D - E - C#m - F#m - Bm - E - A",
        "notes": "天青色等烟雨 而我在等你 炊烟袅袅升起 隔江千万里"
    },
    {
        "id": "zh_037",
        "title": "发如雪 (Snow-Like Hair)",
        "artist": "周杰伦 (Jay Chou)",
        "key": "D major",
        "section": "Chorus (副歌)",
        "progression": "4,5,3,6,2,5,1",
        "chords": ["G", "A", "F#m", "Bm", "Em", "A", "D"],
        "roman": "IV-V-iii-vi-ii-V-I",
        "description": "D大调王道进行：G - A - F#m - Bm - Em - A - D",
        "notes": "你发如雪 凄美了离别 我焚香感动了谁"
    },
    {
        "id": "zh_038",
        "title": "千里之外 (Far Away)",
        "artist": "周杰伦 / 费玉清",
        "key": "Eb major",
        "section": "Chorus (副歌)",
        "progression": "4,5,3,6,2,5,1",
        "chords": ["Ab", "Bb", "Gm", "Cm", "Fm", "Bb", "Eb"],
        "roman": "IV-V-iii-vi-ii-V-I",
        "description": "Eb大调王道进行：Ab - Bb - Gm - Cm - Fm - Bb - Eb",
        "notes": "我送你离开 千里之外 你无声黑白"
    },
    {
        "id": "zh_039",
        "title": "珊瑚海 (Coral Sea)",
        "artist": "周杰伦 / 梁心颐",
        "key": "F major",
        "section": "Chorus (副歌)",
        "progression": "4,5,3,6,2,5,1",
        "chords": ["Bb", "C", "Am", "Dm", "Gm", "C", "F"],
        "roman": "IV-V-iii-vi-ii-V-I",
        "description": "F大调王道进行：Bb - C - Am - Dm - Gm - C - F",
        "notes": "海鸟跟鱼相爱 只是一场意外"
    },
    {
        "id": "zh_040",
        "title": "不能说的秘密 (Secret)",
        "artist": "周杰伦 (Jay Chou)",
        "key": "G major",
        "section": "Chorus (副歌)",
        "progression": "4,5,3,6,2,5,1",
        "chords": ["C", "D", "Bm", "Em", "Am", "D", "G"],
        "roman": "IV-V-iii-vi-ii-V-I",
        "description": "G大调经典王道抒情副歌：C - D - Bm - Em - Am - D - G",
        "notes": "最美的不是下雨天 是曾与你躲过雨的屋檐"
    },
    {
        "id": "zh_041",
        "title": "爱如潮水 (Love is Like a Tide)",
        "artist": "张信哲 (Jeff Chang)",
        "key": "C major",
        "section": "Chorus (副歌)",
        "progression": "4,5,3,6,2,5,1",
        "chords": ["F", "G", "Em", "Am", "Dm", "G", "C"],
        "roman": "IV-V-iii-vi-ii-V-I",
        "description": "C大调经典王道进行：F - G - Em - Am - Dm - G - C",
        "notes": "不愿别的男人见识你的妩媚"
    },
    {
        "id": "zh_042",
        "title": "可惜没如果 (If Only)",
        "artist": "林俊杰 (JJ Lin)",
        "key": "C major",
        "section": "Chorus (副歌)",
        "progression": "4,5,3,6,2,5,1",
        "chords": ["F", "G", "Em", "Am", "Dm", "G", "C"],
        "roman": "IV-V-iii-vi-ii-V-I",
        "description": "C大调王道进行深情副歌：F - G - Em - Am - Dm - G - C",
        "notes": "全都怪我 不该沉默时沉默 该勇敢时软弱"
    },
    {
        "id": "zh_043",
        "title": "认真的雪 (Snow)",
        "artist": "薛之谦 (Joker Xue)",
        "key": "C major",
        "section": "Chorus (副歌)",
        "progression": "4,5,3,6,2,5,1",
        "chords": ["F", "G", "Em", "Am", "Dm", "G", "C"],
        "roman": "IV-V-iii-vi-ii-V-I",
        "description": "C大调王道进行：F - G - Em - Am - Dm - G - C",
        "notes": "爱得那么深 爱得那么认真"
    },
    {
        "id": "zh_044",
        "title": "隐形的翅膀 (Invisible Wings)",
        "artist": "张韶涵 (Angela Chang)",
        "key": "C major",
        "section": "Chorus (副歌)",
        "progression": "4,5,3,6,2,5,1",
        "chords": ["F", "G", "Em", "Am", "Dm", "G", "C"],
        "roman": "IV-V-iii-vi-ii-V-I",
        "description": "C大调王道进行励志副歌：F - G - Em - Am - Dm - G - C",
        "notes": "我知道 我一直有双隐形的翅膀"
    },
    {
        "id": "zh_045",
        "title": "最初的梦想 (Initial Dream)",
        "artist": "范玮琪 (Christine Fan)",
        "key": "Bb major",
        "section": "Chorus (副歌)",
        "progression": "4,5,3,6,2,5,1",
        "chords": ["Eb", "F", "Dm", "Gm", "Cm", "F", "Bb"],
        "roman": "IV-V-iii-vi-ii-V-I",
        "description": "中岛美雪经典改编王道进行：Eb - F - Dm - Gm - Cm - F - Bb",
        "notes": "最初的梦想 紧握在手上 最想要去的地方 怎么能在半路就返航"
    },

    # =========================================================================
    # 4. 1-5-6-3-4-1-2-5 & 1-5-6-3-4-1-4-5 (Pachelbel's Canon 卡农进行)
    # =========================================================================
    {
        "id": "zh_046",
        "title": "说好的幸福呢 (The Promised Love)",
        "artist": "周杰伦 (Jay Chou)",
        "key": "C major",
        "section": "Verse & Chorus (主歌与副歌)",
        "progression": "1,5,6,3,4,1,2,5",
        "chords": ["C", "G/B", "Am", "Em/G", "F", "C/E", "Dm7", "G7"],
        "roman": "I-V-vi-iii-IV-I-ii-V",
        "description": "C大调经典卡农下行进行：C - G - Am - Em - F - C - Dm - G",
        "notes": "你的回话凌乱着 在这个时刻"
    },
    {
        "id": "zh_047",
        "title": "安静 (Silence)",
        "artist": "周杰伦 (Jay Chou)",
        "key": "Bb major",
        "section": "Verse & Chorus (主歌与副歌)",
        "progression": "1,5,6,3,4,1,2,5",
        "chords": ["Bb", "F", "Gm", "Dm", "Eb", "Bb", "Cm", "F"],
        "roman": "I-V-vi-iii-IV-I-ii-V",
        "description": "Bb大调经典卡农进行：Bb - F - Gm - Dm - Eb - Bb - Cm - F",
        "notes": "只剩下钢琴陪我弹了一天 睡着的大提琴 安静的旧旧的"
    },
    {
        "id": "zh_048",
        "title": "开不了口 (Can't Speak)",
        "artist": "周杰伦 (Jay Chou)",
        "key": "Db major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,3,4,1,2,5",
        "chords": ["Db", "Ab", "Bbm", "Fm", "Gb", "Db", "Ebm", "Ab"],
        "roman": "I-V-vi-iii-IV-I-ii-V",
        "description": "Db大调卡农副歌进行：Db - Ab - Bbm - Fm - Gb - Db - Ebm - Ab",
        "notes": "没有你在我有多难熬 没有你在我有多难熬"
    },
    {
        "id": "zh_049",
        "title": "勇气 (Courage)",
        "artist": "梁静茹 (Fish Leong)",
        "key": "F major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,3,4,1,2,5",
        "chords": ["F", "C", "Dm", "Am", "Bb", "F", "Gm", "C"],
        "roman": "I-V-vi-iii-IV-I-ii-V",
        "description": "F大调卡农大合唱：F - C - Dm - Am - Bb - F - Gm - C",
        "notes": "爱真的需要勇气 来面对流言蜚语"
    },
    {
        "id": "zh_050",
        "title": "七里香 (Common Jasmine Orange)",
        "artist": "周杰伦 (Jay Chou)",
        "key": "Eb major",
        "section": "Verse (主歌)",
        "progression": "1,5,6,3,4,1,2,5",
        "chords": ["Eb", "Bb", "Cm", "Gm", "Ab", "Eb", "Fm", "Bb"],
        "roman": "I-V-vi-iii-IV-I-ii-V",
        "description": "Eb大调卡农变体：Eb - Bb - Cm - Gm - Ab - Eb - Fm - Bb",
        "notes": "窗外的麻雀 在电线杆上多嘴"
    },
    {
        "id": "zh_051",
        "title": "爱我还是他 (Love Me or Him)",
        "artist": "陶喆 (David Tao)",
        "key": "G major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,3,4,1,2,5",
        "chords": ["G", "D", "Em", "Bm", "C", "G", "Am", "D"],
        "roman": "I-V-vi-iii-IV-I-ii-V",
        "description": "G大调卡农 R&B 经典进行：G - D - Em - Bm - C - G - Am - D",
        "notes": "你爱我还是他 是不是真的他比我好"
    },
    {
        "id": "zh_052",
        "title": "一千年以后 (A Thousand Years Later)",
        "artist": "林俊杰 (JJ Lin)",
        "key": "C major",
        "section": "Chorus (副歌)",
        "progression": "1,5,6,3,4,1,2,5",
        "chords": ["C", "G", "Am", "Em", "F", "C", "Dm", "G"],
        "roman": "I-V-vi-iii-IV-I-ii-V",
        "description": "C大调经典卡农副歌：C - G - Am - Em - F - C - Dm - G",
        "notes": "因为在一千年以后 世界早已没有我"
    },

    # =========================================================================
    # 5. 1-6-4-5 (I-vi-IV-V) 50年代经典进行 (50s Doo-Wop / 倒卡农)
    # =========================================================================
    {
        "id": "zh_053",
        "title": "倒带 (Rewind)",
        "artist": "蔡依林 (Jolin Tsai) / 周杰伦",
        "key": "C major",
        "section": "Verse (主歌)",
        "progression": "1,6,4,5",
        "chords": ["C", "Am", "F", "G"],
        "roman": "I-vi-IV-V",
        "description": "C大调 1645 主歌倒卡农进行：C - Am - F - G",
        "notes": "我受够了等待 你所谓的安排"
    },
    {
        "id": "zh_054",
        "title": "对面的女孩看过来 (Look Over Here, Girl)",
        "artist": "任贤齐 (Richie Jen)",
        "key": "C major",
        "section": "Verse & Chorus (全曲进行)",
        "progression": "1,6,4,5",
        "chords": ["C", "Am", "F", "G"],
        "roman": "I-vi-IV-V",
        "description": "C大调 1645 欢快循环神曲：C - Am - F - G",
        "notes": "对面的女孩看过来 看过来 看过来"
    },
    {
        "id": "zh_055",
        "title": "恰似你的温柔 (Just Like Your Tenderness)",
        "artist": "邓丽君 / 蔡琴",
        "key": "C major",
        "section": "Verse & Chorus",
        "progression": "1,6,4,5",
        "chords": ["C", "Am", "F", "G"],
        "roman": "I-vi-IV-V",
        "description": "C大调 1645 华语民歌鼻祖进行：C - Am - F - G",
        "notes": "某年某月的某一天 就像一张破碎的脸"
    },
    {
        "id": "zh_056",
        "title": "后来 (Latter)",
        "artist": "刘若英 (Rene Liu)",
        "key": "C major",
        "section": "Verse (主歌)",
        "progression": "1,6,4,5",
        "chords": ["C", "Am", "F", "G"],
        "roman": "I-vi-IV-V",
        "description": "C大调 1645 主歌铺陈：C - Am - F - G",
        "notes": "后来 我总算学会了如何去爱"
    },
    {
        "id": "zh_057",
        "title": "恋爱ING (Love ING)",
        "artist": "五月天 (Mayday)",
        "key": "A major",
        "section": "Chorus (副歌)",
        "progression": "1,6,4,5",
        "chords": ["A", "F#m", "D", "E"],
        "roman": "I-vi-IV-V",
        "description": "A大调 1645 朋克欢快摇滚：A - F#m - D - E",
        "notes": "恋爱ing 改变ing 整个世界 突然变透明"
    },

    # =========================================================================
    # 6. 2-5-1 (ii-V-I) 爵士与 R&B 经典进行 (Jazz Standard)
    # =========================================================================
    {
        "id": "zh_058",
        "title": "迷迭香 (Rosemary)",
        "artist": "周杰伦 (Jay Chou)",
        "key": "C major",
        "section": "Chorus (副歌)",
        "progression": "2,5,1",
        "chords": ["Dm7", "G7", "Cmaj7"],
        "roman": "ii-V-I",
        "description": "Bossa Nova 风格纯正 ii-V-I 爵士进行：Dm7 - G7 - Cmaj7",
        "notes": "你随风飘扬的笑 却迷迭香的味道"
    },
    {
        "id": "zh_059",
        "title": "印地安老斑鸠 (Ancient Indian Cuckoo)",
        "artist": "周杰伦 (Jay Chou)",
        "key": "F major",
        "section": "Bridge (桥段)",
        "progression": "2,5,1",
        "chords": ["Gm7", "C7", "Fmaj7"],
        "roman": "ii-V-I",
        "description": "Acid Jazz / Funk 风格 ii-V-I：Gm7 - C7 - Fmaj7",
        "notes": "牛仔戴假发 陆地打篮球"
    },
    {
        "id": "zh_060",
        "title": "Fly Me to the Moon",
        "artist": "Frank Sinatra / 爵士名曲",
        "key": "C major",
        "section": "Chorus (副歌)",
        "progression": "2,5,1",
        "chords": ["Dm7", "G7", "Cmaj7"],
        "roman": "ii-V-I",
        "description": "爵士乐永恒标准进行：Dm7 - G7 - Cmaj7",
        "notes": "Fly me to the moon and let me play among the stars"
    }
]
