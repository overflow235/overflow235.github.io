/* 교회사역 플랫폼 · 연결 설정 (깃허브 무료판)
   여기에는 비밀번호나 AI 키를 넣지 않습니다. 모두 공개돼도 되는 값입니다. */
window.SYR_CONFIG = {
  google: {
    clientId: "383723869928-k5lsrn10up6rgne0j3pmmd3t6dov82ch.apps.googleusercontent.com"
  },

  // 처음 시작할 수 있는 사람 (최종 관리자)
  ownerEmails: ["leehyesung516@gmail.com"],

  // 드라이브 자료 폴더 이름 (Apps Script의 FOLDER_NAME과 똑같이)
  folderName: "교회사역 플랫폼 DB",

  // 가입 신청서 (구글 설문) 주소와 응답 시트 ID
  joinFormUrl: "https://forms.gle/r4ku8KZonfjkjU9CA",
  joinSheetId: "1rbIMeiwfphr8u1_BVYYM4BCu0crjnGh8WbKjF2yX42M",

  // AI 중계: Apps Script 웹 앱 주소(/exec)를 따옴표 안에 넣습니다
  ai: {
    relayUrl: "https://script.google.com/macros/s/AKfycbylw2CDwknsHfS8z9MQAbH26Fm8xupTs-lPfQ0moHggaUR1ObBg9EKVjZa9wGaWHu57/exec",
    model: "claude-sonnet-5-5", modelFast: "claude-haiku-5-5", maxImages: 5
  }
};
