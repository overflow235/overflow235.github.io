/**
 * 교회 사역 플랫폼 · AI 중계 (Google Apps Script · 무료)
 *
 * - AI 키를 여기(스크립트 속성)에만 보관합니다. 웹 화면 · 깃허브에는 키가 없습니다.
 * - 플랫폼에 로그인한 사람의 구글 로그인 정보를 확인하고,
 *   배포한 사람 드라이브의 자료 폴더(config.js의 folderName)를 공유받은 사람(=승인된 사람)만 AI를 쓰게 합니다.
 * - 사람마다 하루 사용 횟수를 제한합니다.
 * - 최종 관리자는 플랫폼 "시스템 설정"에서 오늘 사용량을 보고, 한도 · 모델을 바꿀 수 있습니다.
 *   (AI 키는 여기 스크립트 속성에서만 바꿉니다. 플랫폼 화면으로는 절대 보내지 않습니다.)
 *
 * 스크립트 속성 (프로젝트 설정 → 스크립트 속성):
 *   AI_API_KEY    : sk-ant-... (필수)
 *   CLIENT_ID     : config.js 의 clientId 와 같은 값 (필수)
 *   DAILY_LIMIT   : 1인 하루 AI 사용 횟수 (기본 30)
 *   OWNER_LIMIT   : 최종 관리자 하루 사용 횟수 (기본 300)
 *   FOLDER_NAME   : 자료 폴더 이름 (config.js의 folderName과 똑같이)
 *   ADMIN_EMAILS  : (선택) 최종 관리자를 넘겨받은 사람 이메일. 여러 명은 쉼표로. 관리자 한도 · 사용량 보기 적용
 *   AI_MODEL      : 기본 모델 (기본 claude-sonnet-5-5)
 *   AI_MODEL_FAST : 빠른 모델 (기본 claude-haiku-5-5)
 */
const P = PropertiesService.getScriptProperties();
const TZ = 'Asia/Seoul';

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const who = check_(req.token);
    if (!who) return out_({ error: 'login' });

    if (req.action === 'usage') {
      if (!who.owner) return out_({ error: 'owner_only' });
      return out_({ v: 2, usage: usage_(), cfg: cfg_() });
    }
    if (req.action === 'config') {
      if (!who.owner) return out_({ error: 'owner_only' });
      const c = req.cfg || {};
      const d = Math.round(Number(c.daily)), o = Math.round(Number(c.owner));
      const okModel = function (m) { return /^claude-[a-z0-9.-]{3,60}$/.test(String(m || '')); };
      if (!(d >= 1 && d <= 1000) || !(o >= 1 && o <= 1000) || !okModel(c.model) || !okModel(c.modelFast)) return out_({ error: 'bad_value' });
      const admins = (Array.isArray(c.admins) ? c.admins : []).map(function (x) { return String(x).trim().toLowerCase(); })
        .filter(function (x) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x); }).slice(0, 10);
      P.setProperties({ DAILY_LIMIT: String(d), OWNER_LIMIT: String(o), ADMIN_EMAILS: admins.join(','), AI_MODEL: c.model, AI_MODEL_FAST: c.modelFast });
      return out_({ ok: true, cfg: cfg_() });
    }

    const limit = who.owner ? Number(P.getProperty('OWNER_LIMIT') || 300) : Number(P.getProperty('DAILY_LIMIT') || 30);
    const n = count_(who.email);
    if (n > limit) return out_({ error: 'daily_limit', limit: limit });

    const b = req.body || {};
    if (!Array.isArray(b.messages)) return out_({ error: 'bad_request' });
    const body = {
      model: b.tier === 'fast' ? (P.getProperty('AI_MODEL_FAST') || 'claude-haiku-5-5') : (P.getProperty('AI_MODEL') || 'claude-sonnet-5-5'),
      max_tokens: Math.min(Number(b.max_tokens) || 4000, 8000),
      messages: b.messages
    };
    if (Array.isArray(b.tools)) body.tools = b.tools.slice(0, 12);
    if (b.system) body.system = String(b.system).slice(0, 20000);

    const r = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'x-api-key': P.getProperty('AI_API_KEY'), 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify(body)
    });
    if (r.getResponseCode() !== 200) return out_({ error: 'ai_upstream', code: r.getResponseCode() });
    const j = JSON.parse(r.getContentText());
    return out_({ content: j.content, stop_reason: j.stop_reason, left: limit - n });
  } catch (err) {
    return out_({ error: 'server' });
  }
}

// 로그인 확인 + 승인 여부 (폴더 공유 여부)
function check_(token) {
  if (!token) return null;
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  const t = JSON.parse(r.getContentText());
  const cid = P.getProperty('CLIENT_ID');
  if (!cid || (t.aud !== cid && t.azp !== cid)) return null;           // 우리 플랫폼에서 받은 로그인만 인정
  const email = String(t.email || '').toLowerCase();
  if (!email || String(t.email_verified) !== 'true') return null;
  const me = Session.getEffectiveUser().getEmail().toLowerCase();
  const admins = String(P.getProperty('ADMIN_EMAILS') || '').toLowerCase().split(/[\s,]+/).filter(String);
  if (email === me || admins.indexOf(email) >= 0) return { email: email, owner: true };

  const cache = CacheService.getScriptCache();
  const c = cache.get('m_' + email);
  if (c === '1') return { email: email, owner: false };
  if (c === '0') return null;
  let ok = false;
  const it = DriveApp.getFoldersByName(P.getProperty('FOLDER_NAME') || '사역 플랫폼 DB');
  while (it.hasNext()) {
    const f = it.next();
    if (f.getOwner() && f.getOwner().getEmail().toLowerCase() === me) {
      ok = f.getEditors().some(function (u) { return u.getEmail().toLowerCase() === email; });
      break;
    }
  }
  cache.put('m_' + email, ok ? '1' : '0', 600);                       // 10분 동안 기억 (승인 해제도 10분 안에 반영)
  return ok ? { email: email, owner: false } : null;
}

// 하루 사용 횟수 세기
function count_(email) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const day = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
    const k = 'u_' + day + '_' + email;
    const n = Number(P.getProperty(k) || 0) + 1;
    P.setProperty(k, String(n));
    if (Math.random() < 0.05) {                                        // 지난 날짜 기록 정리
      const all = P.getProperties();
      Object.keys(all).forEach(function (x) { if (x.indexOf('u_') === 0 && x.indexOf('u_' + day + '_') !== 0) P.deleteProperty(x); });
    }
    return n;
  } finally { lock.releaseLock(); }
}

function usage_() {
  const day = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const pre = 'u_' + day + '_';
  const all = P.getProperties();
  return Object.keys(all).filter(function (k) { return k.indexOf(pre) === 0; }).map(function (k) { return { email: k.slice(pre.length), n: Number(all[k]) }; });
}

// 최종 관리자에게 보여 줄 설정 (AI 키 값은 절대 보내지 않음)
function cfg_() {
  return {
    daily: Number(P.getProperty('DAILY_LIMIT') || 30),
    owner: Number(P.getProperty('OWNER_LIMIT') || 300),
    admins: String(P.getProperty('ADMIN_EMAILS') || '').split(/[\s,]+/).filter(String),
    model: P.getProperty('AI_MODEL') || 'claude-sonnet-5-5',
    modelFast: P.getProperty('AI_MODEL_FAST') || 'claude-haiku-5-5',
    keySet: !!P.getProperty('AI_API_KEY')
  };
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// 처음 한 번 실행해서 권한을 허락하는 용도 (편집기에서 이 함수를 골라 ▶ 실행)
function setupPermissions() {
  DriveApp.getRootFolder();
  UrlFetchApp.fetch('https://www.google.com', { muteHttpExceptions: true });
  Logger.log('준비 완료: ' + Session.getEffectiveUser().getEmail());
}
