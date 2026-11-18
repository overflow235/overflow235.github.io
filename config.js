/* 수영로 사역 플랫폼 · 연결 설정 (깃허브 무료판)
   여기에는 비밀번호나 AI 키를 넣지 않습니다. 모두 공개돼도 되는 값입니다. */
window.SYR_CONFIG = {
  google: {
    // Google Cloud 콘솔 → API 및 서비스 → 사용자 인증 정보 → OAuth 클라이언트 ID (웹 애플리케이션)
    clientId: "123456789-abcde.apps.googleusercontent.com"
  },
  // 최종 관리자 구글 이메일 (이 사람의 드라이브에 자료가 저장됩니다)
  ownerEmails: ["leehyesung516@gmail.com"],
  // 드라이브에 만들 자료 폴더 이름 (바꾸지 않아도 됩니다)
  folderName: "수영로 사역 플랫폼 DB",
  // 가입 신청서 (구글 설문) 주소와, 응답이 쌓이는 구글 시트 ID
  joinFormUrl: "https://forms.gle/여기에_설문주소",
  joinSheetId: "여기에_시트ID",
  ai: {
    // 승인된 모든 사람이 목사님 AI를 쓰게 하려면: ai-relay.gs 를 배포한 웹 앱 주소를 넣습니다 (README 5번)
    // 비워 두면 목사님 기기에 넣은 AI 키로 목사님만 씁니다
    relayUrl: "",
    model: "claude-sonnet-5-5", modelFast: "claude-haiku-5-5", maxImages: 5
  }
};
