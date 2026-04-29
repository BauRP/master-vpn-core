// Trivo VPN Elite — i18n dictionaries
// 15 languages with full UI coverage

export type LangCode =
  | "en" | "ru" | "kk" | "zh" | "ja" | "ko"
  | "de" | "fr" | "es" | "it" | "pt" | "tr"
  | "pl" | "nl" | "ar";

export const LANGUAGES: { code: LangCode; native: string; english: string; rtl?: boolean }[] = [
  { code: "en", native: "English",    english: "English" },
  { code: "ru", native: "Русский",    english: "Russian" },
  { code: "kk", native: "Қазақша",    english: "Kazakh" },
  { code: "zh", native: "中文",        english: "Chinese" },
  { code: "ja", native: "日本語",      english: "Japanese" },
  { code: "ko", native: "한국어",      english: "Korean" },
  { code: "de", native: "Deutsch",    english: "German" },
  { code: "fr", native: "Français",   english: "French" },
  { code: "es", native: "Español",    english: "Spanish" },
  { code: "it", native: "Italiano",   english: "Italian" },
  { code: "pt", native: "Português",  english: "Portuguese" },
  { code: "tr", native: "Türkçe",     english: "Turkish" },
  { code: "pl", native: "Polski",     english: "Polish" },
  { code: "nl", native: "Nederlands", english: "Dutch" },
  { code: "ar", native: "العربية",    english: "Arabic", rtl: true },
];

export type TranslationKeys = {
  // App shell
  "app.version": string;
  "nav.dashboard": string;
  "nav.settings": string;
  "nav.profile": string;

  // Dashboard
  "dash.identity": string;
  "dash.hidden": string;
  "dash.exposed": string;
  "dash.protect": string;
  "dash.protected": string;
  "dash.tapToConnect": string;
  "dash.stealthTunnel": string;
  "dash.active": string;
  "dash.standby": string;
  "dash.virtualIp": string;
  "dash.throughput": string;
  "dash.down": string;
  "dash.up": string;
  "dash.smartServer": string;
  "dash.change": string;

  // Settings
  "set.title": string;
  "set.subtitle": string;
  "set.language": string;
  "set.languageDesc": string;
  "set.security": string;
  "set.killSwitch": string;
  "set.killSwitchDesc": string;
  "set.encDns": string;
  "set.encDnsDesc": string;
  "set.protocol": string;
  "set.protoActive": string;
  "set.protoReady": string;
  "set.splitTunnel": string;
  "set.splitTunnelDesc": string;
  "set.autoConnect": string;
  "set.bootConnect": string;
  "set.bootConnectDesc": string;
  "set.alwaysOn": string;
  "set.alwaysOnDesc": string;
  "set.build": string;
  "set.selectLanguage": string;
  "set.cancel": string;

  // Profile
  "prof.userId": string;
  "prof.elite": string;
  "prof.boss": string;
  "prof.sessions": string;
  "prof.leaks": string;
  "prof.dataStored": string;
  "prof.memberSince": string;
  "prof.volatile": string;
  "prof.audit": string;
  "prof.auditDesc": string;
  "prof.wipe": string;
  "prof.wiping": string;
  "prof.chat": string;
  "prof.chatSub": string;
  "prof.github": string;
  "prof.githubSub": string;

  // Security suite (Stealth + PQC + Leak monitor)
  "sec.suite": string;
  "sec.stealth": string;
  "sec.stealthDesc": string;
  "sec.tls": string;
  "sec.tlsDesc": string;
  "sec.pqc": string;
  "sec.pqcDesc": string;
  "sec.kyber": string;
  "sec.dpiCycle": string;
  "sec.dpiCycleDesc": string;
  "dash.stealth": string;
  "dash.quantum": string;
  "dash.leakMon": string;
  "dash.leakOk": string;
  "dash.leakAlert": string;
  "prof.quantumSafe": string;
  "prof.ramOnly": string;
  "prof.ramOnlyDesc": string;
};

type Dict = Record<LangCode, TranslationKeys>;

// Security suite shared defaults (English) — spread into each full dict
const secEn = {
  "sec.suite": "SECURITY SUITE",
  "sec.stealth": "Stealth Mode (Shadowsocks)",
  "sec.stealthDesc": "Wraps WireGuard packets in an AEAD Shadowsocks stream to strip VPN signatures from DPI fingerprints.",
  "sec.tls": "TLS 1.3 Camouflage",
  "sec.tlsDesc": "Masquerades the tunnel as standard HTTPS on port 443 with SNI spoofing.",
  "sec.pqc": "Post-Quantum Layer",
  "sec.pqcDesc": "Wraps the AES-256-GCM tunnel in Kyber-1024 / Dilithium handshake. Quantum-safe.",
  "sec.kyber": "KYBER-1024",
  "sec.dpiCycle": "DPI Fallback Cycling",
  "sec.dpiCycleDesc": "Automatically rotates obfuscated ports if deep-packet inspection interferes.",
  "dash.stealth": "STEALTH",
  "dash.quantum": "QUANTUM-SAFE",
  "dash.leakMon": "LEAK MONITOR",
  "dash.leakOk": "0 / NO LEAK",
  "dash.leakAlert": "ALERT",
  "prof.quantumSafe": "QUANTUM-SAFE",
  "prof.ramOnly": "DISKLESS · RAM-ONLY",
  "prof.ramOnlyDesc": "Connected node runs in volatile memory. Zero persistent storage on infrastructure.",
} as const;

const en: TranslationKeys = {
  ...secEn,
  "app.version": "v1.0 · ELITE",
  "nav.dashboard": "HOME",
  "nav.settings": "SETTINGS",
  "nav.profile": "PROFILE",

  "dash.identity": "YOUR IDENTITY",
  "dash.hidden": "HIDDEN",
  "dash.exposed": "EXPOSED",
  "dash.protect": "PROTECT",
  "dash.protected": "PROTECTED",
  "dash.tapToConnect": "TAP TO CONNECT",
  "dash.stealthTunnel": "STEALTH TUNNEL",
  "dash.active": "ACTIVE",
  "dash.standby": "STANDBY",
  "dash.virtualIp": "VIRTUAL IP",
  "dash.throughput": "REAL-TIME THROUGHPUT",
  "dash.down": "↓ DOWN",
  "dash.up": "↑ UP",
  "dash.smartServer": "SMART SERVER",
  "dash.change": "CHANGE",

  "set.title": "Advanced Settings",
  "set.subtitle": "// TECHNICAL CONTROLS",
  "set.language": "Language",
  "set.languageDesc": "Choose your interface language.",
  "set.security": "SECURITY",
  "set.killSwitch": "Kill Switch",
  "set.killSwitchDesc": "Immediately blocks all internet traffic if VPN connection drops to prevent IP leak.",
  "set.encDns": "Private Encrypted DNS",
  "set.encDnsDesc": "Routes DNS through encrypted channel. Prevents ISP tracking.",
  "set.protocol": "PROTOCOL",
  "set.protoActive": "ACTIVE",
  "set.protoReady": "READY",
  "set.splitTunnel": "SPLIT TUNNELING",
  "set.splitTunnelDesc": "Exclude specific apps from the VPN tunnel.",
  "set.autoConnect": "AUTO-CONNECT",
  "set.bootConnect": "Connect on system boot",
  "set.bootConnectDesc": "VPN starts automatically with your device.",
  "set.alwaysOn": "Always-on VPN",
  "set.alwaysOnDesc": "Android VpnService keeps the tunnel active 24/7.",
  "set.build": "BUILD 1.0.0 · XRAY-CORE · API 36",
  "set.selectLanguage": "Select Language",
  "set.cancel": "Cancel",

  "prof.userId": "USER ID",
  "prof.elite": "ELITE PROTECTED",
  "prof.boss": "BOSS LEVEL",
  "prof.sessions": "SESSIONS",
  "prof.leaks": "LEAKS",
  "prof.dataStored": "DATA STORED",
  "prof.memberSince": "MEMBER SINCE",
  "prof.volatile": "VOLATILE · RAM-ONLY",
  "prof.audit": "Security Audit",
  "prof.auditDesc": "Wipe all cached data and rotate your anonymous ID. This action is instant and irreversible.",
  "prof.wipe": "Wipe App Data",
  "prof.wiping": "Wiping…",
  "prof.chat": "Trivo Chat Elite",
  "prof.chatSub": "Encrypted P2P support",
  "prof.github": "GitHub Repository",
  "prof.githubSub": "Open-source audit trail",
};

const ru: TranslationKeys = {
  ...secEn,
  "sec.suite": "БЕЗОПАСНОСТЬ",
  "sec.stealth": "Стелс-режим (Shadowsocks)",
  "sec.stealthDesc": "Оборачивает WireGuard-пакеты в AEAD-поток Shadowsocks, скрывая VPN-сигнатуры от DPI.",
  "sec.tls": "Маскировка под TLS 1.3",
  "sec.tlsDesc": "Маскирует туннель под обычный HTTPS на порту 443 с подменой SNI.",
  "sec.pqc": "Постквантовый слой",
  "sec.pqcDesc": "Оборачивает AES-256-GCM в Kyber-1024 / Dilithium. Защита от квантовых атак.",
  "sec.kyber": "KYBER-1024",
  "sec.dpiCycle": "Циклирование портов при DPI",
  "sec.dpiCycleDesc": "Автоматически меняет обфусцированные порты при вмешательстве DPI.",
  "dash.stealth": "СТЕЛС",
  "dash.quantum": "QUANTUM-SAFE",
  "dash.leakMon": "МОНИТОР УТЕЧЕК",
  "dash.leakOk": "0 / БЕЗ УТЕЧЕК",
  "dash.leakAlert": "ТРЕВОГА",
  "prof.quantumSafe": "QUANTUM-SAFE",
  "prof.ramOnly": "БЕЗДИСКОВЫЙ · ТОЛЬКО RAM",
  "prof.ramOnlyDesc": "Подключённый узел работает в энергозависимой памяти. Никаких постоянных хранилищ.",
  "app.version": "v1.0 · ЭЛИТА",
  "nav.dashboard": "ГЛАВНАЯ",
  "nav.settings": "НАСТРОЙКИ",
  "nav.profile": "ПРОФИЛЬ",

  "dash.identity": "ВАША ЛИЧНОСТЬ",
  "dash.hidden": "СКРЫТА",
  "dash.exposed": "ОТКРЫТА",
  "dash.protect": "ЗАЩИТИТЬ",
  "dash.protected": "ЗАЩИЩЕНО",
  "dash.tapToConnect": "НАЖМИТЕ ДЛЯ ПОДКЛ.",
  "dash.stealthTunnel": "СТЕЛС-ТУННЕЛЬ",
  "dash.active": "АКТИВЕН",
  "dash.standby": "ОЖИДАНИЕ",
  "dash.virtualIp": "ВИРТУАЛЬНЫЙ IP",
  "dash.throughput": "ПРОПУСКНАЯ СПОСОБНОСТЬ",
  "dash.down": "↓ ПРИЁМ",
  "dash.up": "↑ ОТДАЧА",
  "dash.smartServer": "УМНЫЙ СЕРВЕР",
  "dash.change": "СМЕНИТЬ",

  "set.title": "Расширенные настройки",
  "set.subtitle": "// ТЕХНИЧЕСКИЕ ПАРАМЕТРЫ",
  "set.language": "Язык",
  "set.languageDesc": "Выберите язык интерфейса.",
  "set.security": "БЕЗОПАСНОСТЬ",
  "set.killSwitch": "Аварийный выключатель",
  "set.killSwitchDesc": "Мгновенно блокирует весь интернет-трафик при разрыве VPN, чтобы исключить утечку IP.",
  "set.encDns": "Приватный зашифр. DNS",
  "set.encDnsDesc": "Маршрутизирует DNS через зашифрованный канал. Блокирует слежку провайдера.",
  "set.protocol": "ПРОТОКОЛ",
  "set.protoActive": "АКТИВЕН",
  "set.protoReady": "ГОТОВ",
  "set.splitTunnel": "РАЗДЕЛЕНИЕ ТРАФИКА",
  "set.splitTunnelDesc": "Исключите отдельные приложения из VPN-туннеля.",
  "set.autoConnect": "АВТО-ПОДКЛЮЧЕНИЕ",
  "set.bootConnect": "Подключаться при загрузке",
  "set.bootConnectDesc": "VPN запускается автоматически вместе с устройством.",
  "set.alwaysOn": "Always-on VPN",
  "set.alwaysOnDesc": "Android VpnService держит туннель активным 24/7.",
  "set.build": "СБОРКА 1.0.0 · XRAY-CORE · API 36",
  "set.selectLanguage": "Выбор языка",
  "set.cancel": "Отмена",

  "prof.userId": "ID ПОЛЬЗОВАТЕЛЯ",
  "prof.elite": "ЭЛИТНАЯ ЗАЩИТА",
  "prof.boss": "BOSS LEVEL",
  "prof.sessions": "СЕССИИ",
  "prof.leaks": "УТЕЧКИ",
  "prof.dataStored": "СОХР. ДАННЫЕ",
  "prof.memberSince": "С НАМИ С",
  "prof.volatile": "ТОЛЬКО RAM",
  "prof.audit": "Аудит безопасности",
  "prof.auditDesc": "Удалить все кэшированные данные и сменить анонимный ID. Действие мгновенное и необратимое.",
  "prof.wipe": "Очистить данные",
  "prof.wiping": "Очистка…",
  "prof.chat": "Trivo Chat Elite",
  "prof.chatSub": "Зашифрованная P2P-поддержка",
  "prof.github": "Репозиторий GitHub",
  "prof.githubSub": "Открытый аудит-код",
};

const kk: TranslationKeys = {
  ...secEn,
  "app.version": "v1.0 · ЭЛИТ",
  "nav.dashboard": "ТАҚТА",
  "nav.settings": "БАПТАУЛАР",
  "nav.profile": "ПРОФИЛЬ",

  "dash.identity": "СІЗДІҢ ИДЕНТТІГІҢІЗ",
  "dash.hidden": "ЖАСЫРЫН",
  "dash.exposed": "АШЫҚ",
  "dash.protect": "ҚОРҒАУ",
  "dash.protected": "ҚОРҒАЛҒАН",
  "dash.tapToConnect": "ҚОСУ ҮШІН БАСЫҢЫЗ",
  "dash.stealthTunnel": "ЖАСЫРЫН ТУННЕЛЬ",
  "dash.active": "БЕЛСЕНДІ",
  "dash.standby": "КҮТУ",
  "dash.virtualIp": "ВИРТУАЛДЫ IP",
  "dash.throughput": "НАҚТЫ УАҚЫТТАҒЫ ЖЫЛДАМДЫҚ",
  "dash.down": "↓ ҚАБЫЛДАУ",
  "dash.up": "↑ ЖІБЕРУ",
  "dash.smartServer": "АҚЫЛДЫ СЕРВЕР",
  "dash.change": "АУЫСТЫРУ",

  "set.title": "Қосымша баптаулар",
  "set.subtitle": "// ТЕХНИКАЛЫҚ БАСҚАРУ",
  "set.language": "Тіл",
  "set.languageDesc": "Интерфейс тілін таңдаңыз.",
  "set.security": "ҚАУІПСІЗДІК",
  "set.killSwitch": "Авариялық ажыратқыш",
  "set.killSwitchDesc": "VPN үзілсе, IP ағуын болдырмау үшін барлық интернет трафигін бірден бұғаттайды.",
  "set.encDns": "Жеке шифрланған DNS",
  "set.encDnsDesc": "DNS-ті шифрланған арна арқылы бағыттайды. Провайдер бақылауын болдырмайды.",
  "set.protocol": "ХАТТАМА",
  "set.protoActive": "БЕЛСЕНДІ",
  "set.protoReady": "ДАЙЫН",
  "set.splitTunnel": "ТРАФИКТІ БӨЛУ",
  "set.splitTunnelDesc": "Кейбір қосымшаларды VPN туннелінен шығарыңыз.",
  "set.autoConnect": "АВТО-ҚОСЫЛУ",
  "set.bootConnect": "Жүйе іске қосылғанда қосылу",
  "set.bootConnectDesc": "VPN құрылғымен бірге автоматты іске қосылады.",
  "set.alwaysOn": "Always-on VPN",
  "set.alwaysOnDesc": "Android VpnService туннельді 24/7 белсенді ұстайды.",
  "set.build": "BUILD 1.0.0 · XRAY-CORE · API 36",
  "set.selectLanguage": "Тілді таңдау",
  "set.cancel": "Болдырмау",

  "prof.userId": "ПАЙДАЛАНУШЫ ID",
  "prof.elite": "ЭЛИТ ҚОРҒАНЫС",
  "prof.boss": "BOSS LEVEL",
  "prof.sessions": "СЕАНСТАР",
  "prof.leaks": "АҒУЛАР",
  "prof.dataStored": "САҚТАЛҒАН ДЕРЕК",
  "prof.memberSince": "МҮШЕЛІК",
  "prof.volatile": "ТЕК RAM",
  "prof.audit": "Қауіпсіздік аудиті",
  "prof.auditDesc": "Барлық кэшті өшіріп, анонимді ID-ді жаңартыңыз. Әрекет лезде орындалады және қайтарылмайды.",
  "prof.wipe": "Деректерді өшіру",
  "prof.wiping": "Өшірілуде…",
  "prof.chat": "Trivo Chat Elite",
  "prof.chatSub": "Шифрланған P2P қолдау",
  "prof.github": "GitHub репозиторийі",
  "prof.githubSub": "Ашық аудит-код",
};

const zh: TranslationKeys = {
  ...secEn,
  "app.version": "v1.0 · 精英版",
  "nav.dashboard": "仪表盘",
  "nav.settings": "设置",
  "nav.profile": "我的",

  "dash.identity": "您的身份",
  "dash.hidden": "已隐藏",
  "dash.exposed": "已暴露",
  "dash.protect": "保护",
  "dash.protected": "受保护",
  "dash.tapToConnect": "点击连接",
  "dash.stealthTunnel": "隐身隧道",
  "dash.active": "活动中",
  "dash.standby": "待机",
  "dash.virtualIp": "虚拟 IP",
  "dash.throughput": "实时吞吐量",
  "dash.down": "↓ 下载",
  "dash.up": "↑ 上传",
  "dash.smartServer": "智能服务器",
  "dash.change": "更改",

  "set.title": "高级设置",
  "set.subtitle": "// 技术控制",
  "set.language": "语言",
  "set.languageDesc": "选择您的界面语言。",
  "set.security": "安全",
  "set.killSwitch": "紧急断网",
  "set.killSwitchDesc": "VPN 连接中断时立即阻止所有网络流量,防止 IP 泄漏。",
  "set.encDns": "私密加密 DNS",
  "set.encDnsDesc": "通过加密通道路由 DNS,防止运营商追踪。",
  "set.protocol": "协议",
  "set.protoActive": "已启用",
  "set.protoReady": "就绪",
  "set.splitTunnel": "分应用代理",
  "set.splitTunnelDesc": "将特定应用排除在 VPN 隧道之外。",
  "set.autoConnect": "自动连接",
  "set.bootConnect": "开机自动连接",
  "set.bootConnectDesc": "VPN 随设备一起自动启动。",
  "set.alwaysOn": "始终开启 VPN",
  "set.alwaysOnDesc": "Android VpnService 全天候保持隧道活动。",
  "set.build": "版本 1.0.0 · XRAY-CORE · API 36",
  "set.selectLanguage": "选择语言",
  "set.cancel": "取消",

  "prof.userId": "用户 ID",
  "prof.elite": "精英保护",
  "prof.boss": "BOSS 等级",
  "prof.sessions": "会话",
  "prof.leaks": "泄漏",
  "prof.dataStored": "存储数据",
  "prof.memberSince": "加入时间",
  "prof.volatile": "易失性 · 仅 RAM",
  "prof.audit": "安全审计",
  "prof.auditDesc": "清除所有缓存数据并轮换您的匿名 ID。此操作即时且不可逆。",
  "prof.wipe": "清除应用数据",
  "prof.wiping": "清除中…",
  "prof.chat": "Trivo Chat Elite",
  "prof.chatSub": "加密 P2P 支持",
  "prof.github": "GitHub 仓库",
  "prof.githubSub": "开源审计记录",
};

const ja: TranslationKeys = {
  ...secEn,
  "app.version": "v1.0 · エリート",
  "nav.dashboard": "ダッシュボード",
  "nav.settings": "設定",
  "nav.profile": "プロフィール",

  "dash.identity": "あなたの身元",
  "dash.hidden": "非表示",
  "dash.exposed": "露出",
  "dash.protect": "保護",
  "dash.protected": "保護済み",
  "dash.tapToConnect": "タップして接続",
  "dash.stealthTunnel": "ステルストンネル",
  "dash.active": "アクティブ",
  "dash.standby": "スタンバイ",
  "dash.virtualIp": "仮想 IP",
  "dash.throughput": "リアルタイム速度",
  "dash.down": "↓ ダウン",
  "dash.up": "↑ アップ",
  "dash.smartServer": "スマートサーバー",
  "dash.change": "変更",

  "set.title": "詳細設定",
  "set.subtitle": "// テクニカル制御",
  "set.language": "言語",
  "set.languageDesc": "インターフェース言語を選択してください。",
  "set.security": "セキュリティ",
  "set.killSwitch": "キルスイッチ",
  "set.killSwitchDesc": "VPN 接続が切れた場合、IP 漏洩を防ぐため即座に全インターネット通信を遮断します。",
  "set.encDns": "プライベート暗号化 DNS",
  "set.encDnsDesc": "DNS を暗号化チャネル経由でルーティング。ISP の追跡を防ぎます。",
  "set.protocol": "プロトコル",
  "set.protoActive": "アクティブ",
  "set.protoReady": "準備完了",
  "set.splitTunnel": "スプリットトンネリング",
  "set.splitTunnelDesc": "特定のアプリを VPN トンネルから除外します。",
  "set.autoConnect": "自動接続",
  "set.bootConnect": "起動時に接続",
  "set.bootConnectDesc": "デバイスと一緒に VPN を自動起動します。",
  "set.alwaysOn": "常時 VPN",
  "set.alwaysOnDesc": "Android VpnService がトンネルを 24/7 維持します。",
  "set.build": "ビルド 1.0.0 · XRAY-CORE · API 36",
  "set.selectLanguage": "言語を選択",
  "set.cancel": "キャンセル",

  "prof.userId": "ユーザー ID",
  "prof.elite": "エリート保護",
  "prof.boss": "BOSS レベル",
  "prof.sessions": "セッション",
  "prof.leaks": "リーク",
  "prof.dataStored": "保存データ",
  "prof.memberSince": "メンバー開始",
  "prof.volatile": "揮発性 · RAM のみ",
  "prof.audit": "セキュリティ監査",
  "prof.auditDesc": "全キャッシュを消去し匿名 ID を更新します。即時かつ不可逆です。",
  "prof.wipe": "アプリデータを消去",
  "prof.wiping": "消去中…",
  "prof.chat": "Trivo Chat Elite",
  "prof.chatSub": "暗号化 P2P サポート",
  "prof.github": "GitHub リポジトリ",
  "prof.githubSub": "オープンソース監査",
};

// Lightweight stubs — fall back to English where not yet localized.
// (Production build should be filled out by translators.)
const partial = (overrides: Partial<TranslationKeys>): TranslationKeys => ({ ...en, ...overrides });

const ko = partial({
  "nav.dashboard": "대시보드", "nav.settings": "설정", "nav.profile": "프로필",
  "dash.protect": "보호", "dash.protected": "보호됨", "dash.hidden": "숨김", "dash.exposed": "노출됨",
  "dash.tapToConnect": "연결하려면 탭", "set.title": "고급 설정", "set.language": "언어",
  "set.killSwitch": "킬 스위치", "prof.wipe": "앱 데이터 지우기", "set.selectLanguage": "언어 선택",
});
const de = partial({
  "nav.dashboard": "ÜBERSICHT", "nav.settings": "EINSTELLUNGEN", "nav.profile": "PROFIL",
  "dash.protect": "SCHÜTZEN", "dash.protected": "GESCHÜTZT", "dash.hidden": "VERBORGEN", "dash.exposed": "OFFEN",
  "dash.tapToConnect": "ZUM VERBINDEN TIPPEN", "set.title": "Erweiterte Einstellungen",
  "set.language": "Sprache", "set.killSwitch": "Notausschalter", "prof.wipe": "App-Daten löschen",
  "set.selectLanguage": "Sprache auswählen",
});
const fr = partial({
  "nav.dashboard": "TABLEAU", "nav.settings": "RÉGLAGES", "nav.profile": "PROFIL",
  "dash.protect": "PROTÉGER", "dash.protected": "PROTÉGÉ", "dash.hidden": "MASQUÉE", "dash.exposed": "EXPOSÉE",
  "dash.tapToConnect": "TOUCHEZ POUR CONNECTER", "set.title": "Paramètres avancés",
  "set.language": "Langue", "set.killSwitch": "Coupe-circuit", "prof.wipe": "Effacer les données",
  "set.selectLanguage": "Sélectionner la langue",
});
const es = partial({
  "nav.dashboard": "PANEL", "nav.settings": "AJUSTES", "nav.profile": "PERFIL",
  "dash.protect": "PROTEGER", "dash.protected": "PROTEGIDO", "dash.hidden": "OCULTA", "dash.exposed": "EXPUESTA",
  "dash.tapToConnect": "TOCA PARA CONECTAR", "set.title": "Ajustes avanzados",
  "set.language": "Idioma", "set.killSwitch": "Interruptor de seguridad", "prof.wipe": "Borrar datos",
  "set.selectLanguage": "Seleccionar idioma",
});
const it = partial({
  "nav.dashboard": "DASHBOARD", "nav.settings": "IMPOSTAZIONI", "nav.profile": "PROFILO",
  "dash.protect": "PROTEGGI", "dash.protected": "PROTETTO", "dash.hidden": "NASCOSTA", "dash.exposed": "ESPOSTA",
  "dash.tapToConnect": "TOCCA PER CONNETTERE", "set.title": "Impostazioni avanzate",
  "set.language": "Lingua", "set.killSwitch": "Kill Switch", "prof.wipe": "Cancella dati app",
  "set.selectLanguage": "Seleziona lingua",
});
const pt = partial({
  "nav.dashboard": "PAINEL", "nav.settings": "AJUSTES", "nav.profile": "PERFIL",
  "dash.protect": "PROTEGER", "dash.protected": "PROTEGIDO", "dash.hidden": "OCULTA", "dash.exposed": "EXPOSTA",
  "dash.tapToConnect": "TOQUE PARA CONECTAR", "set.title": "Configurações avançadas",
  "set.language": "Idioma", "set.killSwitch": "Kill Switch", "prof.wipe": "Apagar dados",
  "set.selectLanguage": "Selecionar idioma",
});
const tr = partial({
  "nav.dashboard": "PANO", "nav.settings": "AYARLAR", "nav.profile": "PROFİL",
  "dash.protect": "KORU", "dash.protected": "KORUNDU", "dash.hidden": "GİZLİ", "dash.exposed": "AÇIK",
  "dash.tapToConnect": "BAĞLANMAK İÇİN DOKUN", "set.title": "Gelişmiş Ayarlar",
  "set.language": "Dil", "set.killSwitch": "Acil Kapatma", "prof.wipe": "Uygulama verisini sil",
  "set.selectLanguage": "Dil seçin",
});
const pl = partial({
  "nav.dashboard": "PULPIT", "nav.settings": "USTAWIENIA", "nav.profile": "PROFIL",
  "dash.protect": "CHROŃ", "dash.protected": "CHRONIONA", "dash.hidden": "UKRYTA", "dash.exposed": "ODSŁONIĘTA",
  "dash.tapToConnect": "DOTKNIJ, ABY POŁĄCZYĆ", "set.title": "Ustawienia zaawansowane",
  "set.language": "Język", "set.killSwitch": "Wyłącznik awaryjny", "prof.wipe": "Wyczyść dane aplikacji",
  "set.selectLanguage": "Wybierz język",
});
const nl = partial({
  "nav.dashboard": "DASHBOARD", "nav.settings": "INSTELLINGEN", "nav.profile": "PROFIEL",
  "dash.protect": "BESCHERM", "dash.protected": "BESCHERMD", "dash.hidden": "VERBORGEN", "dash.exposed": "ZICHTBAAR",
  "dash.tapToConnect": "TIK OM TE VERBINDEN", "set.title": "Geavanceerde instellingen",
  "set.language": "Taal", "set.killSwitch": "Noodschakelaar", "prof.wipe": "App-gegevens wissen",
  "set.selectLanguage": "Taal kiezen",
});
const ar = partial({
  "nav.dashboard": "اللوحة", "nav.settings": "الإعدادات", "nav.profile": "الملف",
  "dash.protect": "حماية", "dash.protected": "محمي", "dash.hidden": "مخفية", "dash.exposed": "مكشوفة",
  "dash.tapToConnect": "اضغط للاتصال", "set.title": "الإعدادات المتقدمة",
  "set.language": "اللغة", "set.killSwitch": "مفتاح الإيقاف", "prof.wipe": "مسح بيانات التطبيق",
  "set.selectLanguage": "اختر اللغة", "set.cancel": "إلغاء",
  "dash.identity": "هويتك",
});

export const dictionaries: Dict = {
  en, ru, kk, zh, ja, ko, de, fr, es, it, pt, tr, pl, nl, ar,
};
