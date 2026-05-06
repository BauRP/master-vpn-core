// Master VPN — i18n dictionaries
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
  "prof.chat": "Master VPN Support",
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
  "prof.chat": "Master VPN Support",
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
  "prof.chat": "Master VPN Support",
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
  "prof.chat": "Master VPN Support",
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
  "prof.chat": "Master VPN Support",
  "prof.chatSub": "暗号化 P2P サポート",
  "prof.github": "GitHub リポジトリ",
  "prof.githubSub": "オープンソース監査",
};

// Helper for full dictionaries — falls back to English for any missing keys
// so we never render a raw key string in the UI.
const full = (overrides: Partial<TranslationKeys>): TranslationKeys => ({ ...en, ...overrides });

const ko: TranslationKeys = full({
  "app.version": "v1.0 · 엘리트",
  "nav.dashboard": "대시보드", "nav.settings": "설정", "nav.profile": "프로필",
  "dash.identity": "당신의 신원", "dash.hidden": "숨김", "dash.exposed": "노출됨",
  "dash.protect": "보호", "dash.protected": "보호됨", "dash.tapToConnect": "탭하여 연결",
  "dash.stealthTunnel": "스텔스 터널", "dash.active": "활성", "dash.standby": "대기",
  "dash.virtualIp": "가상 IP", "dash.throughput": "실시간 처리량",
  "dash.down": "↓ 다운", "dash.up": "↑ 업", "dash.smartServer": "스마트 서버", "dash.change": "변경",
  "set.title": "고급 설정", "set.subtitle": "// 기술 제어",
  "set.language": "언어", "set.languageDesc": "인터페이스 언어를 선택하세요.",
  "set.security": "보안", "set.killSwitch": "킬 스위치",
  "set.killSwitchDesc": "VPN 연결이 끊어지면 IP 누출을 방지하기 위해 모든 트래픽을 즉시 차단합니다.",
  "set.encDns": "암호화 DNS", "set.encDnsDesc": "DNS를 암호화 채널로 라우팅합니다.",
  "set.protocol": "프로토콜", "set.protoActive": "활성", "set.protoReady": "준비됨",
  "set.splitTunnel": "스플릿 터널링", "set.splitTunnelDesc": "특정 앱을 VPN 터널에서 제외합니다.",
  "set.autoConnect": "자동 연결", "set.bootConnect": "부팅 시 연결",
  "set.bootConnectDesc": "기기와 함께 VPN이 자동으로 시작됩니다.",
  "set.alwaysOn": "항상 켜기 VPN", "set.alwaysOnDesc": "Android VpnService가 24/7 터널을 유지합니다.",
  "set.build": "빌드 1.0.0 · XRAY-CORE · API 36",
  "set.selectLanguage": "언어 선택", "set.cancel": "취소",
  "prof.userId": "사용자 ID", "prof.elite": "엘리트 보호", "prof.boss": "BOSS 레벨",
  "prof.sessions": "세션", "prof.leaks": "누출", "prof.dataStored": "저장 데이터",
  "prof.memberSince": "가입일", "prof.volatile": "휘발성 · RAM 전용",
  "prof.audit": "보안 감사",
  "prof.auditDesc": "캐시된 모든 데이터를 삭제하고 익명 ID를 교체합니다. 즉시 적용되며 되돌릴 수 없습니다.",
  "prof.wipe": "앱 데이터 삭제", "prof.wiping": "삭제 중…",
  "prof.chatSub": "암호화 P2P 지원", "prof.github": "GitHub 저장소", "prof.githubSub": "오픈소스 감사 기록",
});

const de: TranslationKeys = full({
  "app.version": "v1.0 · ELITE",
  "nav.dashboard": "ÜBERSICHT", "nav.settings": "EINSTELLUNGEN", "nav.profile": "PROFIL",
  "dash.identity": "IHRE IDENTITÄT", "dash.hidden": "VERBORGEN", "dash.exposed": "OFFEN",
  "dash.protect": "SCHÜTZEN", "dash.protected": "GESCHÜTZT", "dash.tapToConnect": "TIPPEN ZUM VERBINDEN",
  "dash.stealthTunnel": "TARN-TUNNEL", "dash.active": "AKTIV", "dash.standby": "BEREITSCHAFT",
  "dash.virtualIp": "VIRTUELLE IP", "dash.throughput": "ECHTZEIT-DURCHSATZ",
  "dash.down": "↓ DOWN", "dash.up": "↑ UP", "dash.smartServer": "SMART-SERVER", "dash.change": "ÄNDERN",
  "set.title": "Erweiterte Einstellungen", "set.subtitle": "// TECHNISCHE STEUERUNG",
  "set.language": "Sprache", "set.languageDesc": "Wählen Sie Ihre Oberflächensprache.",
  "set.security": "SICHERHEIT", "set.killSwitch": "Notausschalter",
  "set.killSwitchDesc": "Blockiert sofort den gesamten Internetverkehr, falls die VPN-Verbindung abbricht.",
  "set.encDns": "Privates verschlüsseltes DNS",
  "set.encDnsDesc": "Leitet DNS über einen verschlüsselten Kanal. Verhindert ISP-Tracking.",
  "set.protocol": "PROTOKOLL", "set.protoActive": "AKTIV", "set.protoReady": "BEREIT",
  "set.splitTunnel": "SPLIT-TUNNELING", "set.splitTunnelDesc": "Bestimmte Apps vom VPN-Tunnel ausschließen.",
  "set.autoConnect": "AUTO-VERBINDEN", "set.bootConnect": "Beim Systemstart verbinden",
  "set.bootConnectDesc": "VPN startet automatisch mit Ihrem Gerät.",
  "set.alwaysOn": "Always-on VPN", "set.alwaysOnDesc": "Android VpnService hält den Tunnel 24/7 aktiv.",
  "set.build": "BUILD 1.0.0 · XRAY-CORE · API 36",
  "set.selectLanguage": "Sprache auswählen", "set.cancel": "Abbrechen",
  "prof.userId": "BENUTZER-ID", "prof.elite": "ELITE-SCHUTZ", "prof.boss": "BOSS-LEVEL",
  "prof.sessions": "SITZUNGEN", "prof.leaks": "LECKS", "prof.dataStored": "GESPEICHERTE DATEN",
  "prof.memberSince": "MITGLIED SEIT", "prof.volatile": "FLÜCHTIG · NUR RAM",
  "prof.audit": "Sicherheits-Audit",
  "prof.auditDesc": "Alle zwischengespeicherten Daten löschen und anonyme ID rotieren. Sofort und unwiderruflich.",
  "prof.wipe": "App-Daten löschen", "prof.wiping": "Lösche…",
  "prof.chatSub": "Verschlüsselter P2P-Support", "prof.github": "GitHub-Repository", "prof.githubSub": "Open-Source-Audit",
});

const fr: TranslationKeys = full({
  "app.version": "v1.0 · ÉLITE",
  "nav.dashboard": "ACCUEIL", "nav.settings": "RÉGLAGES", "nav.profile": "PROFIL",
  "dash.identity": "VOTRE IDENTITÉ", "dash.hidden": "MASQUÉE", "dash.exposed": "EXPOSÉE",
  "dash.protect": "PROTÉGER", "dash.protected": "PROTÉGÉ", "dash.tapToConnect": "TOUCHEZ POUR CONNECTER",
  "dash.stealthTunnel": "TUNNEL FURTIF", "dash.active": "ACTIF", "dash.standby": "VEILLE",
  "dash.virtualIp": "IP VIRTUELLE", "dash.throughput": "DÉBIT EN TEMPS RÉEL",
  "dash.down": "↓ DESC.", "dash.up": "↑ ENV.", "dash.smartServer": "SERVEUR INTELLIGENT", "dash.change": "CHANGER",
  "set.title": "Paramètres avancés", "set.subtitle": "// CONTRÔLES TECHNIQUES",
  "set.language": "Langue", "set.languageDesc": "Choisissez la langue de l'interface.",
  "set.security": "SÉCURITÉ", "set.killSwitch": "Coupe-circuit",
  "set.killSwitchDesc": "Bloque tout le trafic si le VPN tombe, pour éviter une fuite d'IP.",
  "set.encDns": "DNS privé chiffré",
  "set.encDnsDesc": "Achemine le DNS via un canal chiffré. Empêche le suivi du FAI.",
  "set.protocol": "PROTOCOLE", "set.protoActive": "ACTIF", "set.protoReady": "PRÊT",
  "set.splitTunnel": "TUNNEL FRACTIONNÉ", "set.splitTunnelDesc": "Excluez certaines apps du tunnel VPN.",
  "set.autoConnect": "CONNEXION AUTO", "set.bootConnect": "Connecter au démarrage",
  "set.bootConnectDesc": "Le VPN démarre automatiquement avec votre appareil.",
  "set.alwaysOn": "VPN toujours actif", "set.alwaysOnDesc": "VpnService Android maintient le tunnel 24/7.",
  "set.build": "BUILD 1.0.0 · XRAY-CORE · API 36",
  "set.selectLanguage": "Sélectionner la langue", "set.cancel": "Annuler",
  "prof.userId": "ID UTILISATEUR", "prof.elite": "PROTECTION ÉLITE", "prof.boss": "NIVEAU BOSS",
  "prof.sessions": "SESSIONS", "prof.leaks": "FUITES", "prof.dataStored": "DONNÉES STOCKÉES",
  "prof.memberSince": "MEMBRE DEPUIS", "prof.volatile": "VOLATILE · RAM UNIQUEMENT",
  "prof.audit": "Audit de sécurité",
  "prof.auditDesc": "Effacer toutes les données en cache et changer votre ID anonyme. Action immédiate et irréversible.",
  "prof.wipe": "Effacer les données", "prof.wiping": "Effacement…",
  "prof.chatSub": "Support P2P chiffré", "prof.github": "Dépôt GitHub", "prof.githubSub": "Audit open source",
});

const es: TranslationKeys = full({
  "app.version": "v1.0 · ÉLITE",
  "nav.dashboard": "INICIO", "nav.settings": "AJUSTES", "nav.profile": "PERFIL",
  "dash.identity": "TU IDENTIDAD", "dash.hidden": "OCULTA", "dash.exposed": "EXPUESTA",
  "dash.protect": "PROTEGER", "dash.protected": "PROTEGIDO", "dash.tapToConnect": "TOCA PARA CONECTAR",
  "dash.stealthTunnel": "TÚNEL SIGILOSO", "dash.active": "ACTIVO", "dash.standby": "EN ESPERA",
  "dash.virtualIp": "IP VIRTUAL", "dash.throughput": "RENDIMIENTO EN TIEMPO REAL",
  "dash.down": "↓ BAJADA", "dash.up": "↑ SUBIDA", "dash.smartServer": "SERVIDOR INTELIGENTE", "dash.change": "CAMBIAR",
  "set.title": "Ajustes avanzados", "set.subtitle": "// CONTROLES TÉCNICOS",
  "set.language": "Idioma", "set.languageDesc": "Elige el idioma de la interfaz.",
  "set.security": "SEGURIDAD", "set.killSwitch": "Interruptor de seguridad",
  "set.killSwitchDesc": "Bloquea todo el tráfico si la VPN se cae, evitando fugas de IP.",
  "set.encDns": "DNS privado cifrado",
  "set.encDnsDesc": "Enruta DNS por canal cifrado. Evita el rastreo del proveedor.",
  "set.protocol": "PROTOCOLO", "set.protoActive": "ACTIVO", "set.protoReady": "LISTO",
  "set.splitTunnel": "TÚNEL DIVIDIDO", "set.splitTunnelDesc": "Excluye apps específicas del túnel VPN.",
  "set.autoConnect": "AUTO-CONEXIÓN", "set.bootConnect": "Conectar al iniciar",
  "set.bootConnectDesc": "La VPN se inicia automáticamente con tu dispositivo.",
  "set.alwaysOn": "VPN siempre activa", "set.alwaysOnDesc": "VpnService de Android mantiene el túnel 24/7.",
  "set.build": "BUILD 1.0.0 · XRAY-CORE · API 36",
  "set.selectLanguage": "Seleccionar idioma", "set.cancel": "Cancelar",
  "prof.userId": "ID DE USUARIO", "prof.elite": "PROTECCIÓN ÉLITE", "prof.boss": "NIVEL JEFE",
  "prof.sessions": "SESIONES", "prof.leaks": "FUGAS", "prof.dataStored": "DATOS GUARDADOS",
  "prof.memberSince": "MIEMBRO DESDE", "prof.volatile": "VOLÁTIL · SOLO RAM",
  "prof.audit": "Auditoría de seguridad",
  "prof.auditDesc": "Borra todos los datos en caché y rota tu ID anónimo. Inmediato e irreversible.",
  "prof.wipe": "Borrar datos", "prof.wiping": "Borrando…",
  "prof.chatSub": "Soporte P2P cifrado", "prof.github": "Repositorio GitHub", "prof.githubSub": "Auditoría open source",
});

const it: TranslationKeys = full({
  "app.version": "v1.0 · ÉLITE",
  "nav.dashboard": "HOME", "nav.settings": "IMPOSTAZIONI", "nav.profile": "PROFILO",
  "dash.identity": "LA TUA IDENTITÀ", "dash.hidden": "NASCOSTA", "dash.exposed": "ESPOSTA",
  "dash.protect": "PROTEGGI", "dash.protected": "PROTETTO", "dash.tapToConnect": "TOCCA PER CONNETTERE",
  "dash.stealthTunnel": "TUNNEL FURTIVO", "dash.active": "ATTIVO", "dash.standby": "STANDBY",
  "dash.virtualIp": "IP VIRTUALE", "dash.throughput": "VELOCITÀ IN TEMPO REALE",
  "dash.down": "↓ GIÙ", "dash.up": "↑ SU", "dash.smartServer": "SERVER INTELLIGENTE", "dash.change": "CAMBIA",
  "set.title": "Impostazioni avanzate", "set.subtitle": "// CONTROLLI TECNICI",
  "set.language": "Lingua", "set.languageDesc": "Scegli la lingua dell'interfaccia.",
  "set.security": "SICUREZZA", "set.killSwitch": "Kill Switch",
  "set.killSwitchDesc": "Blocca subito tutto il traffico se la VPN cade, evitando fughe di IP.",
  "set.encDns": "DNS privato cifrato",
  "set.encDnsDesc": "Instrada il DNS su canale cifrato. Blocca il tracciamento del provider.",
  "set.protocol": "PROTOCOLLO", "set.protoActive": "ATTIVO", "set.protoReady": "PRONTO",
  "set.splitTunnel": "SPLIT TUNNELING", "set.splitTunnelDesc": "Escludi app specifiche dal tunnel VPN.",
  "set.autoConnect": "AUTO-CONNESSIONE", "set.bootConnect": "Connetti all'avvio",
  "set.bootConnectDesc": "La VPN parte automaticamente con il dispositivo.",
  "set.alwaysOn": "VPN sempre attiva", "set.alwaysOnDesc": "VpnService Android mantiene il tunnel 24/7.",
  "set.build": "BUILD 1.0.0 · XRAY-CORE · API 36",
  "set.selectLanguage": "Seleziona lingua", "set.cancel": "Annulla",
  "prof.userId": "ID UTENTE", "prof.elite": "PROTEZIONE ÉLITE", "prof.boss": "LIVELLO BOSS",
  "prof.sessions": "SESSIONI", "prof.leaks": "FUGHE", "prof.dataStored": "DATI SALVATI",
  "prof.memberSince": "MEMBRO DAL", "prof.volatile": "VOLATILE · SOLO RAM",
  "prof.audit": "Audit di sicurezza",
  "prof.auditDesc": "Cancella tutti i dati in cache e ruota l'ID anonimo. Immediato e irreversibile.",
  "prof.wipe": "Cancella dati app", "prof.wiping": "Cancellazione…",
  "prof.chatSub": "Supporto P2P cifrato", "prof.github": "Repository GitHub", "prof.githubSub": "Audit open source",
});

const pt: TranslationKeys = full({
  "app.version": "v1.0 · ELITE",
  "nav.dashboard": "INÍCIO", "nav.settings": "AJUSTES", "nav.profile": "PERFIL",
  "dash.identity": "SUA IDENTIDADE", "dash.hidden": "OCULTA", "dash.exposed": "EXPOSTA",
  "dash.protect": "PROTEGER", "dash.protected": "PROTEGIDO", "dash.tapToConnect": "TOQUE PARA CONECTAR",
  "dash.stealthTunnel": "TÚNEL FURTIVO", "dash.active": "ATIVO", "dash.standby": "EM ESPERA",
  "dash.virtualIp": "IP VIRTUAL", "dash.throughput": "TAXA EM TEMPO REAL",
  "dash.down": "↓ DOWN", "dash.up": "↑ UP", "dash.smartServer": "SERVIDOR INTELIGENTE", "dash.change": "TROCAR",
  "set.title": "Configurações avançadas", "set.subtitle": "// CONTROLES TÉCNICOS",
  "set.language": "Idioma", "set.languageDesc": "Escolha o idioma da interface.",
  "set.security": "SEGURANÇA", "set.killSwitch": "Kill Switch",
  "set.killSwitchDesc": "Bloqueia todo o tráfego se a VPN cair, evitando vazamento de IP.",
  "set.encDns": "DNS privado criptografado",
  "set.encDnsDesc": "Roteia DNS por canal criptografado. Bloqueia rastreamento do provedor.",
  "set.protocol": "PROTOCOLO", "set.protoActive": "ATIVO", "set.protoReady": "PRONTO",
  "set.splitTunnel": "TÚNEL DIVIDIDO", "set.splitTunnelDesc": "Exclua apps específicos do túnel VPN.",
  "set.autoConnect": "AUTO-CONEXÃO", "set.bootConnect": "Conectar ao iniciar",
  "set.bootConnectDesc": "A VPN inicia automaticamente com seu dispositivo.",
  "set.alwaysOn": "VPN sempre ativa", "set.alwaysOnDesc": "Android VpnService mantém o túnel 24/7.",
  "set.build": "BUILD 1.0.0 · XRAY-CORE · API 36",
  "set.selectLanguage": "Selecionar idioma", "set.cancel": "Cancelar",
  "prof.userId": "ID DO USUÁRIO", "prof.elite": "PROTEÇÃO ELITE", "prof.boss": "NÍVEL CHEFE",
  "prof.sessions": "SESSÕES", "prof.leaks": "VAZAMENTOS", "prof.dataStored": "DADOS ARMAZENADOS",
  "prof.memberSince": "MEMBRO DESDE", "prof.volatile": "VOLÁTIL · APENAS RAM",
  "prof.audit": "Auditoria de segurança",
  "prof.auditDesc": "Apaga todos os dados em cache e gira seu ID anônimo. Imediato e irreversível.",
  "prof.wipe": "Apagar dados", "prof.wiping": "Apagando…",
  "prof.chatSub": "Suporte P2P criptografado", "prof.github": "Repositório GitHub", "prof.githubSub": "Auditoria open source",
});

const tr: TranslationKeys = full({
  "app.version": "v1.0 · ELİT",
  "nav.dashboard": "ANA SAYFA", "nav.settings": "AYARLAR", "nav.profile": "PROFİL",
  "dash.identity": "KİMLİĞİNİZ", "dash.hidden": "GİZLİ", "dash.exposed": "AÇIK",
  "dash.protect": "KORU", "dash.protected": "KORUNDU", "dash.tapToConnect": "BAĞLANMAK İÇİN DOKUN",
  "dash.stealthTunnel": "GİZLİ TÜNEL", "dash.active": "AKTİF", "dash.standby": "BEKLEMEDE",
  "dash.virtualIp": "SANAL IP", "dash.throughput": "GERÇEK ZAMANLI HIZ",
  "dash.down": "↓ İNDİRME", "dash.up": "↑ YÜKLEME", "dash.smartServer": "AKILLI SUNUCU", "dash.change": "DEĞİŞTİR",
  "set.title": "Gelişmiş Ayarlar", "set.subtitle": "// TEKNİK KONTROLLER",
  "set.language": "Dil", "set.languageDesc": "Arayüz dilini seçin.",
  "set.security": "GÜVENLİK", "set.killSwitch": "Acil Kapatma",
  "set.killSwitchDesc": "VPN düşerse IP sızıntısını önlemek için tüm trafiği anında engeller.",
  "set.encDns": "Özel şifreli DNS",
  "set.encDnsDesc": "DNS'i şifreli kanaldan yönlendirir. ISS takibini engeller.",
  "set.protocol": "PROTOKOL", "set.protoActive": "AKTİF", "set.protoReady": "HAZIR",
  "set.splitTunnel": "BÖLÜNMÜŞ TÜNEL", "set.splitTunnelDesc": "Belirli uygulamaları VPN tünelinden hariç tutun.",
  "set.autoConnect": "OTO-BAĞLANTI", "set.bootConnect": "Açılışta bağlan",
  "set.bootConnectDesc": "VPN cihazınızla birlikte otomatik başlar.",
  "set.alwaysOn": "Her zaman açık VPN", "set.alwaysOnDesc": "Android VpnService tüneli 7/24 açık tutar.",
  "set.build": "BUILD 1.0.0 · XRAY-CORE · API 36",
  "set.selectLanguage": "Dil seçin", "set.cancel": "İptal",
  "prof.userId": "KULLANICI ID", "prof.elite": "ELİT KORUMA", "prof.boss": "PATRON SEVİYESİ",
  "prof.sessions": "OTURUMLAR", "prof.leaks": "SIZINTILAR", "prof.dataStored": "SAKLI VERİ",
  "prof.memberSince": "ÜYELİK", "prof.volatile": "GEÇİCİ · SADECE RAM",
  "prof.audit": "Güvenlik Denetimi",
  "prof.auditDesc": "Tüm önbellek verilerini silin ve anonim ID'nizi yenileyin. Anında ve geri alınamaz.",
  "prof.wipe": "Uygulama verisini sil", "prof.wiping": "Siliniyor…",
  "prof.chatSub": "Şifreli P2P destek", "prof.github": "GitHub deposu", "prof.githubSub": "Açık kaynak denetim",
});

const pl: TranslationKeys = full({
  "app.version": "v1.0 · ELITARNA",
  "nav.dashboard": "PULPIT", "nav.settings": "USTAWIENIA", "nav.profile": "PROFIL",
  "dash.identity": "TWOJA TOŻSAMOŚĆ", "dash.hidden": "UKRYTA", "dash.exposed": "ODSŁONIĘTA",
  "dash.protect": "CHROŃ", "dash.protected": "CHRONIONA", "dash.tapToConnect": "DOTKNIJ, ABY POŁĄCZYĆ",
  "dash.stealthTunnel": "TUNEL STEALTH", "dash.active": "AKTYWNY", "dash.standby": "GOTOWOŚĆ",
  "dash.virtualIp": "WIRTUALNE IP", "dash.throughput": "PRZEPUSTOWOŚĆ NA ŻYWO",
  "dash.down": "↓ POBIER.", "dash.up": "↑ WYS.", "dash.smartServer": "INTELIGENTNY SERWER", "dash.change": "ZMIEŃ",
  "set.title": "Ustawienia zaawansowane", "set.subtitle": "// KONTROLE TECHNICZNE",
  "set.language": "Język", "set.languageDesc": "Wybierz język interfejsu.",
  "set.security": "BEZPIECZEŃSTWO", "set.killSwitch": "Wyłącznik awaryjny",
  "set.killSwitchDesc": "Natychmiast blokuje cały ruch, jeśli VPN spadnie, zapobiegając wycieku IP.",
  "set.encDns": "Prywatny szyfrowany DNS",
  "set.encDnsDesc": "Kieruje DNS przez szyfrowany kanał. Blokuje śledzenie operatora.",
  "set.protocol": "PROTOKÓŁ", "set.protoActive": "AKTYWNY", "set.protoReady": "GOTOWY",
  "set.splitTunnel": "DZIELONY TUNEL", "set.splitTunnelDesc": "Wyklucz wybrane aplikacje z tunelu VPN.",
  "set.autoConnect": "AUTO-POŁĄCZENIE", "set.bootConnect": "Łącz przy starcie",
  "set.bootConnectDesc": "VPN startuje automatycznie z urządzeniem.",
  "set.alwaysOn": "VPN zawsze włączony", "set.alwaysOnDesc": "Android VpnService trzyma tunel 24/7.",
  "set.build": "BUILD 1.0.0 · XRAY-CORE · API 36",
  "set.selectLanguage": "Wybierz język", "set.cancel": "Anuluj",
  "prof.userId": "ID UŻYTKOWNIKA", "prof.elite": "OCHRONA ELITARNA", "prof.boss": "POZIOM BOSS",
  "prof.sessions": "SESJE", "prof.leaks": "WYCIEKI", "prof.dataStored": "ZAPISANE DANE",
  "prof.memberSince": "CZŁONEK OD", "prof.volatile": "ULOTNE · TYLKO RAM",
  "prof.audit": "Audyt bezpieczeństwa",
  "prof.auditDesc": "Usuń wszystkie dane z cache i odśwież anonimowe ID. Natychmiastowe i nieodwracalne.",
  "prof.wipe": "Wyczyść dane aplikacji", "prof.wiping": "Czyszczenie…",
  "prof.chatSub": "Szyfrowane wsparcie P2P", "prof.github": "Repozytorium GitHub", "prof.githubSub": "Audyt open source",
});

const nl: TranslationKeys = full({
  "app.version": "v1.0 · ELITE",
  "nav.dashboard": "DASHBOARD", "nav.settings": "INSTELLINGEN", "nav.profile": "PROFIEL",
  "dash.identity": "JOUW IDENTITEIT", "dash.hidden": "VERBORGEN", "dash.exposed": "ZICHTBAAR",
  "dash.protect": "BESCHERM", "dash.protected": "BESCHERMD", "dash.tapToConnect": "TIK OM TE VERBINDEN",
  "dash.stealthTunnel": "STEALTH-TUNNEL", "dash.active": "ACTIEF", "dash.standby": "STAND-BY",
  "dash.virtualIp": "VIRTUEEL IP", "dash.throughput": "REALTIME DOORVOER",
  "dash.down": "↓ DOWN", "dash.up": "↑ UP", "dash.smartServer": "SLIMME SERVER", "dash.change": "WIJZIGEN",
  "set.title": "Geavanceerde instellingen", "set.subtitle": "// TECHNISCHE BEDIENING",
  "set.language": "Taal", "set.languageDesc": "Kies je interfacetaal.",
  "set.security": "BEVEILIGING", "set.killSwitch": "Noodschakelaar",
  "set.killSwitchDesc": "Blokkeert direct al het verkeer als de VPN wegvalt, om IP-lekken te voorkomen.",
  "set.encDns": "Privé versleutelde DNS",
  "set.encDnsDesc": "Routeert DNS via versleuteld kanaal. Voorkomt ISP-tracking.",
  "set.protocol": "PROTOCOL", "set.protoActive": "ACTIEF", "set.protoReady": "GEREED",
  "set.splitTunnel": "SPLIT-TUNNELING", "set.splitTunnelDesc": "Sluit bepaalde apps uit van de VPN-tunnel.",
  "set.autoConnect": "AUTO-VERBINDEN", "set.bootConnect": "Verbinden bij opstarten",
  "set.bootConnectDesc": "VPN start automatisch met je apparaat.",
  "set.alwaysOn": "Altijd-aan VPN", "set.alwaysOnDesc": "Android VpnService houdt de tunnel 24/7 actief.",
  "set.build": "BUILD 1.0.0 · XRAY-CORE · API 36",
  "set.selectLanguage": "Taal kiezen", "set.cancel": "Annuleren",
  "prof.userId": "GEBRUIKERS-ID", "prof.elite": "ELITE-BESCHERMING", "prof.boss": "BAAS-NIVEAU",
  "prof.sessions": "SESSIES", "prof.leaks": "LEKKEN", "prof.dataStored": "OPGESLAGEN DATA",
  "prof.memberSince": "LID SINDS", "prof.volatile": "VLUCHTIG · ALLEEN RAM",
  "prof.audit": "Beveiligingsaudit",
  "prof.auditDesc": "Verwijder alle gecachte data en wissel je anonieme ID. Direct en onomkeerbaar.",
  "prof.wipe": "App-gegevens wissen", "prof.wiping": "Wissen…",
  "prof.chatSub": "Versleutelde P2P-ondersteuning", "prof.github": "GitHub-repository", "prof.githubSub": "Open-source audit",
});

export const dictionaries: Dict = {
  en, ru, kk, zh, ja, ko, de, fr, es, it, pt, tr, pl, nl,
  // Arabic kept for RTL stub; falls back to English where missing.
  ar: full({
    "nav.dashboard": "اللوحة", "nav.settings": "الإعدادات", "nav.profile": "الملف",
    "dash.protect": "حماية", "dash.protected": "محمي", "dash.hidden": "مخفية", "dash.exposed": "مكشوفة",
    "dash.tapToConnect": "اضغط للاتصال", "set.title": "الإعدادات المتقدمة",
    "set.language": "اللغة", "set.killSwitch": "مفتاح الإيقاف", "prof.wipe": "مسح بيانات التطبيق",
    "set.selectLanguage": "اختر اللغة", "set.cancel": "إلغاء", "dash.identity": "هويتك",
  }),
};
