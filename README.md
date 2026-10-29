# StudyAI · AI 학습 도우미

React + Vite 기반 전공 학습 비서. 배포 대상은 **Cloudflare Pages**, 데이터베이스는 **Supabase**, AI는 **ChatKHU API Gateway의 Gemini 모델**입니다.

## 시작

```sh
npm install
npm run dev
```

`npm run build`의 결과는 `dist/`입니다. `npm test`로 서버 입력 검증과 무료 모드 차단 동작을 확인합니다.

## 현재 구현

- 채팅 중심의 반응형 첫 화면, 6개 기초 과목(일반 물리·일반 화학·일반 생물·미분적분학·선형대수·공학수학), 과목별 코칭 대화
- PDF·JPG·PNG 첨부(파일당 2 MB, 최대 3개), 미리보기·취소, 파일만 보내기
- 학생이 이해도를 확인하는 단계, 단계별 로드맵 체크
- YouTube 주제 검색 링크, 자료 검색·필터·저장
- 학습 목표 편집, 진도·자료·목표만 브라우저 로컬 저장
- 대화·이해도·첨부 파일은 메모리에서만 유지. 새로고침·이탈·뒤로가기 복원 시 초기화
- 로고 클릭 시 모든 과목 대화·입력·첨부 초기화, 진행 중 요청 취소 및 늦은 응답 무시
- 연결 후 사용할 수 있는 Supabase 수동 저장/불러오기와 ChatKHU Pages Function

연결 전에는 명확히 표시된 **데모 예시 응답**만 사용합니다. 예시 로드맵은 사전 작성된 입문 과정이며 개인별 진단 결과가 아닙니다. AI를 연결하면 대화에서 맞춤형 로드맵을 받을 수 있지만 상단 로드맵 메뉴의 체크리스트는 예시 과정으로 유지됩니다. YouTube 카드는 실제 검색 결과나 검증된 영상 추천이 아닌 검색 바로가기입니다.

## 비용 0원 운영 조건

이 프로젝트는 결제 가입, 유료 플랜 변경, 외부 유료 서비스 대체 호출을 수행하지 않습니다. 다만 소스 코드로 공급자 계정의 결제 상태를 판별하거나 과금을 절대 차단할 수는 없습니다. **실제 연결 전에 아래 조건을 계정에서 확인해야 합니다.**

1. Cloudflare Workers/Pages Functions 계정은 Free 유지.
2. Supabase 조직/프로젝트는 Free 유지. 유료 업그레이드 금지.
3. ChatKHU는 학교에서 제공한 크레딧만 사용. 학교 계정의 잔액과 이용 조건 확인. 개인 결제, 크레딧 구매 및 자동 충전 금지.
4. 무료 한도를 넘으면 오류를 표시하고 중단. 유료 모델로 자동 대체하거나 자동 재시도하지 않음.
5. 기본 `pages.dev` 주소 사용. 도메인 구매 없음.

`CHATKHU_CREDITS_CONFIRMED=false`가 기본입니다. AI 키가 있어도 이 값이 `true`가 아니면 호출하지 않습니다. 이 변수는 운영자가 확인했다는 표시이며 결제 상태를 검증하는 시스템은 아닙니다. 기본 데모는 외부 AI/DB 요청을 하지 않습니다(웹폰트 로딩 제외).

## Cloudflare Pages 설정

GitHub `DOHYUNN/StudyAI` 저장소에 이 폴더의 내용을 저장소 루트로 올린 뒤 Pages 프로젝트를 연결합니다.

- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: 저장소 루트 (이 폴더 자체를 루트로 올렸을 때)
- Node.js: 22 이상 권장

`functions/api/*`는 Pages Functions로 배포됩니다. React 정적 파일과 함께 같은 Pages 프로젝트에 포함되며 별도 Workers 프로젝트는 만들지 않습니다. Functions 때문에 대시보드의 단순 파일 드래그 업로드 대신 Git 연동 배포를 사용하세요. GitHub 업로드와 Cloudflare Pages 배포는 별도 단계입니다. Pages 프로젝트 연결 후 빌드 설정을 적용하세요.

## Supabase 연결

1. Supabase Free 프로젝트의 공개 URL과 publishable key를 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`에 설정합니다. 기존 공개 anon key 변수도 지원합니다.
2. Google OAuth 클라이언트를 Supabase Auth의 Google 제공자에 연결하고 활성화합니다. Google Client Secret은 Supabase에만 보관합니다. `VITE_AUTH_PROVIDERS=google`을 설정하고 재배포합니다.
3. Site URL 및 허용된 로그인 복귀 주소는 아래 소셜 로그인 절차를 따릅니다. 자동 익명 계정 생성은 사용하지 않습니다.
4. 선택 기능인 클라우드 학습 설정 저장은 `supabase/schema.sql`을 적용하고 사용자별 RLS를 확인한 뒤 `VITE_PROFILE_SYNC_ENABLED=true`로 별도 활성화합니다. 기본값은 비활성화입니다.
5. 로그인 세션만 유지하며 대화·첨부 파일·LearningX 토큰은 영구 저장하지 않습니다. 클라우드 저장/불러오기에도 대화는 포함하지 않습니다.

## ChatKHU 연결

Cloudflare 대시보드 → Workers & Pages → **studyai (Pages)** → Settings → Variables and Secrets에서 Production 환경을 설정합니다.

| 변수 | 설정 |
| --- | --- |
| `CHATKHU_API_KEY` | **Secret** 유형으로 ChatKHU 발급 키 입력. 채팅, GitHub, VITE_ 변수에 입력 금지 |
| `CHATKHU_MODEL` | 선택 사항: 고정할 `gemini-...` 모델 ID. 비워두면 Gateway 목록의 Gemini Flash 계열을 우선 선택 |
| `CHATKHU_CREDITS_CONFIRMED` | 학교 제공 크레딧 및 추가 결제 없는 조건을 확인한 뒤 `true` |
| `TURNSTILE_SITE_KEY` | 무료 Turnstile 위젯의 공개 사이트 키. 호스트는 studyai-9ju.pages.dev |
| `TURNSTILE_SECRET_KEY` | 같은 위젯의 서버 비밀 키를 Secret으로 설정 |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | 선택 사항: 추후 Supabase 연결 시 설정 |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | 선택 사항: Supabase 연동 시 프런트엔드 빌드 설정 |

AI 채팅은 Supabase나 별도 접속 암호 없이 Cloudflare Turnstile 사용자 확인 후 사용할 수 있습니다. 위젯과 서버 키가 모두 있으면 기존 접속 암호 방식보다 우선 적용됩니다. 검증은 Cloudflare Siteverify에서 수행하며 성공 여부, 현재 호스트 이름, `studyai-chat` 액션을 확인합니다. 토큰은 일회용이며 만료 또는 요청 실패 시 새로 확인합니다. Turnstile는 봇 확인이며 개인별 인증이나 사용량 제한은 아닙니다. 학교 크레딧은 계정에서 관리하고, 공개 운영 시 사용자별 사용량 제한을 추가해야 합니다. Supabase는 나중에 기록 저장용으로 연결할 수 있습니다. `STUDYAI_ACCESS_CODE`를 사용한 이전 배포의 호환 코드는 유지하되 Turnstile 설정 시 접속 암호 UI는 표시되지 않습니다. 설정 후 재배포해야 반영됩니다.

제공받은 ChatKHU API Gateway 안내의 **Gemini 네이티브 호환 형식**을 사용합니다. 서버는 `Authorization: Bearer` 헤더로 `https://factchat-cloud.mindlogic.ai/v1/gateway/gemini/v1beta/models/{CHATKHU_MODEL}:generateContent`를 호출합니다. 모델 목록은 인증된 `GET https://factchat-cloud.mindlogic.ai/v1/gateway/models/`에서 확인합니다. 모델 ID를 지정하지 않으면 인증 후 Gateway의 `/models/?type=llm` 목록에서 Gemini 채팅 모델을 선택합니다. 이름에 Flash-Lite, Flash가 포함된 정식 모델을 우선합니다. 이는 크레딧 단가를 보장하지 않습니다. 목록은 서버 메모리에 5분간 보관하며 모델 오류 시 다른 제공업체나 모델로 재시도하지 않습니다. PDF·이미지 분석은 선택한 모델과 Gateway의 지원 여부를 실제로 확인해야 합니다.

`/api/config`는 공개 사이트 키, 준비 여부와 제공업체 이름만 반환합니다. Gateway 요청에는 공식 오류 가이드에서 요구하는 비어 있지 않은 User-Agent를 함께 보냅니다. `/api/chat`은 Turnstile 검증 후 학교 Gateway에 요청합니다. 이전 환경에서는 접속 암호 쿠키 또는 Supabase 세션 검증도 지원합니다. 설정의 AI 연결 확인 버튼은 Turnstile 검증 및 모델 목록 GET만 수행하며 generateContent를 호출하지 않습니다. 크레딧 부족(402), 요청 한도(429), 인증 실패 등은 오류를 표시하고 재시도하지 않습니다. 최근 대화 8개와 현재 질문만 전달하고 답변 출력은 기본 최대 512 토큰으로 제한합니다. `CHATKHU_MAX_OUTPUT_TOKENS`로 64~1,800 사이에서 변경할 수 있습니다. 이 값은 출력 한도이며 입력 및 추론 토큰까지 합친 전체 사용량 보장이 아닙니다. 사용자의 테스트 제한에 따라 실제 모델 생성 테스트는 실행하지 않습니다. 인증 및 모의 응답 테스트만 수행합니다. **이 제한과 확인 변수는 계정의 결제 상태나 남은 크레딧을 자동 검증하지 않습니다.** 잔액 자동 조회 및 사용자별 사용량 제한은 후속 작업입니다.

`npm run dev`는 UI와 데모 검사용이며 Pages Functions는 실행하지 않습니다. 전체 로컬 연동 검증은 Cloudflare Pages 로컬 개발 환경에서 실행해야 합니다. 모의 API 응답으로 인증 헤더, 파일 전달, 답변 처리, 한도 오류 중단을 검증했습니다. ChatKHU 키와 모델 메타데이터 확인 및 실제 Canvas 과제 조회, Supabase Google OAuth 로그인·로그아웃·재로그인을 검증했습니다. 실제 AI 답변 생성 테스트는 실행하지 않았습니다. Vite에서는 `/api/canvas` 로컬 조회 브리지만 별도로 동작합니다.

## 공식 문서

- https://developers.cloudflare.com/pages/configuration/build-configuration/
- https://developers.cloudflare.com/pages/functions/bindings/
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/auth-anonymous
- https://ai.google.dev/api/generate-content

## 채팅 파일 첨부

채팅 입력창의 `파일 첨부` 버튼으로 PDF/JPG/PNG를 선택합니다. 원본은 파일당 2 MB, 합계 6 MB, 한 번에 3개까지입니다. 확장자와 실제 파일 헤더를 브라우저와 서버에서 확인합니다. 파일만 보내면 기본 분석 질문을 함께 전달합니다.

- 데모: 첨부/미리보기/취소를 체험하며 내용은 분석하지 않습니다.
- AI 연결: 질문과 원본 파일을 Pages Function을 통해 ChatKHU Gateway의 Gemini 모델에 전송합니다. 무료 한도 오류 시 중단합니다. 선택한 모델이 PDF·이미지 입력을 지원해야 합니다.
- 현재 페이지에서 해당 과목의 가장 최근 첨부 묶음을 후속 대화에 사용합니다(최근 8개 메시지 범위). 새 묶음 전송 시 이전 묶음을 대체합니다.
- 파일 원본과 파일명·형식·크기 모두 현재 대화의 메모리에만 임시 유지합니다. Supabase/로컬 저장에 첨부 내역이나 대화를 기록하지 않습니다. 새 대화, 페이지 이탈 또는 새로고침 후에는 재첨부해야 합니다. 전송한 자료에는 학교 Gateway와 모델 제공업체의 데이터 처리 정책이 적용됩니다.
- PDF 페이지 수, 암호화, 손상 여부는 별도로 파싱하지 않습니다. 읽을 수 없는 문서는 AI 요청 시 오류가 발생할 수 있습니다.

Google 문서: https://ai.google.dev/gemini-api/docs/document-processing

## 대화 보관 정책

이 웹사이트의 대화는 로그인 여부와 관계없이 임시 대화 방식입니다. 대화와 확인한 이해도, 입력 중 질문 및 첨부 내역은 localStorage/sessionStorage/Supabase에 저장하지 않습니다. 이전 버전이 브라우저에 남긴 대화 데이터는 접속 시 설정 데이터에서 제거합니다. 학습 과목 선택, 진도, 저장한 자료 및 목표는 대화와 분리해 유지합니다. 로고로 새 대화를 시작하거나 페이지에서 이탈하면 과목별 대화 전체와 첨부 메모리를 비웁니다. 진행 중 응답 또는 파일 읽기가 늦게 완료되어도 새 대화에 반영하지 않습니다. 브라우저 뒤로가기로 복원되는 경우에도 대화를 초기화합니다.

### 개인 LearningX 연동

`내 학습`에서 본인의 현재 수강 과목과 과제(제출 완료 포함)를 조회합니다. 월별 과제 캘린더에서 날짜를 선택해 과제 안내와 제출 상태를 확인합니다. 과목별 색상, 이전·다음 달 이동, 오늘 바로 가기, 마감일 없는 과제 모음, 과목·제출 상태 필터와 검색, 학교 원문 링크를 제공합니다. 달력의 날짜와 마감 시간은 한국 시간 기준입니다. 과제 제출이나 성적 변경은 지원하지 않습니다. 자동 갱신·백그라운드 알림·AI 분석을 실행하지 않습니다.

로컬: git에서 제외된 `.dev.vars`에 `CANVAS_ACCESS_TOKEN`을 설정하고 `npm run dev` 후 `내 학습 → 이 컴퓨터의 연결 설정 사용`을 누릅니다. 이 파일은 서버에서만 읽고 배포 파일에 포함하지 않습니다.

Pages: 서버 환경 변수 `CANVAS_OWNER_ID`를 본인 Canvas 사용자 ID로 설정해야 합니다. 사이트에서 본인의 LearningX 토큰을 접속마다 직접 입력합니다. 서버는 전달된 토큰의 소유자를 확인하고 일치하는 경우에만 조회하며, 공용 서버 토큰을 사용하지 않습니다. 토큰·과제는 메모리에만 두며 새로고침, 페이지 이탈, 로고 클릭, 연결 해제 시 지웁니다. 과제 조회 결과는 캐시하지 않습니다. 학교 원문 페이지는 학교 로그인이 필요할 수 있습니다.

현재 구현은 제작자 자신의 토큰을 사용하는 개인 테스트 전용입니다. 다른 학생에게 수동 발급 토큰을 수집하는 서비스로 제공하면 안 되며, 다중 사용자 지원은 학교 승인 OAuth 연동으로 전환해야 합니다. [Canvas OAuth 안내](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth)

### Google 소셜 로그인

로그인 화면은 Google만 지원하며, Supabase 제공자 설정이 끝난 후 `VITE_AUTH_PROVIDERS=google`로 활성화합니다. `VITE_SUPABASE_URL`과 `VITE_SUPABASE_PUBLISHABLE_KEY`(또는 기존 공개 anon 키)를 Pages의 빌드 환경 변수에 설정한 후 재배포합니다. `service_role`, secret 키, Google Client Secret은 프런트엔드 변수에 절대 입력하지 않습니다.

Supabase Auth의 Site URL은 `https://studyai-9ju.pages.dev`로 지정하고, Redirect URLs에는 `https://studyai-9ju.pages.dev/`와 사용하는 로컬 주소만 허용합니다. Google OAuth 리디렉션 주소에는 Supabase에서 보여 주는 `https://<project-ref>.supabase.co/auth/v1/callback`을 등록하고, 제공자 클라이언트 정보는 Supabase Auth 설정에만 입력합니다. PKCE 흐름으로 로그인하며 추가 Google 서비스 권한을 요청하지 않습니다.

로그인 유지에는 Supabase 인증 세션을 사용하지만 대화·첨부 파일·LearningX 토큰은 저장하지 않습니다. 로그아웃 시 현재 대화와 LearningX 임시 연결을 초기화합니다. 학습 목표·진도·저장한 자료는 `supabase/schema.sql` 적용과 본인 데이터만 접근하는 RLS 확인 후 `VITE_PROFILE_SYNC_ENABLED=true`로 따로 활성화합니다. 이후 로그인한 사용자가 직접 저장/불러오기를 선택할 때만 `study_profiles` 테이블에 기록합니다. 자동 익명 계정 생성은 중단했습니다. 현재 소셜 로그인은 학교 계정 인증이나 다중 사용자 LearningX OAuth를 대신하지 않습니다.

2026-10-29 배포에서 Google 최초 동의, StudyAI 계정 표시, 로그아웃 후 세션 해제, 재로그인 및 새로고침 후 로그인 유지를 확인했습니다. 동의 화면에는 기본 Supabase 프로젝트 도메인이 표시될 수 있습니다.

### 전공 로드맵 편집기

무료 MIT 라이선스 `@xyflow/react` 기반의 학기별 과목 편집기입니다. 사용자가 제공한 2026 공과대학 교육과정 PDF의 기계공학부 영역을 사용했습니다. 기계공학전공 편성표(11~12쪽), 학부 내 타전공 전공선택 인정 규정과 추가 과목(12~13쪽), 선수과목 지정표(14~15쪽), 디지털오픈배지 모듈(36~39쪽)을 대조했습니다. 원본 PDF는 재배포하지 않으며, `catalog.json`에 원본 파일의 SHA-256, 출처 쪽수, 재현 가능한 사실 데이터를 기록합니다. `scripts/build-mechanical-catalog.py <source.pdf>`로 재구성할 수 있습니다(pdfplumber 필요).

67개 과목은 기계공학전공 편성 및 학부 내 전공선택 인정 과목 66개와 졸업논문 선수조건의 대안 실험 MEC370 1개입니다. MEC370은 일반 전공필수의 자동 대체가 아닌 별도 범주입니다. 지능로봇공학전공에만 적용되는 타전공 인정 16개 과목은 기계공학전공에 일괄 추가하지 않았습니다. 현재 범위는 기계공학전공이며 지능로봇·항공우주모빌리티 전공 전체 이수 판정은 지원하지 않습니다.

공식 모듈 14개, 선수조건 그룹 40개와 표시용 연결 46개를 제공합니다. 같은 그룹의 options는 택1(OR), 서로 다른 그룹은 모두 충족(AND)으로 검사합니다. 예를 들어 열전달은 열역학 AND (유체역학 OR 공기역학)입니다. 졸업논문은 (첨단기계공학실험 OR 항공우주공학실험)과 두 캡스톤 조건을 각각 검사합니다. 공식 연결은 삭제할 수 없고, 학생이 연결한 파란 점선은 개인 학습 순서일 뿐 이수 조건이 아닙니다. 중복·순환 연결을 막으며 가져온 개인 연결도 공식 관계를 역전할 수 없습니다.

과목은 교육과정 ID와 과목 ID/학수번호로 구분하며 동일 과목명을 자동 병합하지 않습니다. aliases는 검색용으로 대체 이수 목록이 아닙니다. 이 자료에서 일반화학 APCH1131을 화학1·2로 자동 대체하는 규정은 확인되지 않았습니다. 기본 배치 학기는 편성표의 학년 범위와 첫 개설학기를 사용합니다. 이수체계도·구성표와 상충하는 일부 표기는 과목 상세에 적었습니다. 실제 개설 시간표 및 이전 입학생 경과조치는 별도로 확인해야 합니다.

과목·모듈 검색과 필터, 모듈 과목 일괄 추가, 계획 학기 변경, 카드 이동·연결·삭제, 학기별 정렬, 계획 전체 보기, 확대·축소·미니맵을 지원합니다. 계획 학점, 모듈의 계획/이수 표시 개수를 제공합니다. 배지 수여나 졸업 자격을 판정하지 않습니다. 권장 학기는 초기 배치에만 사용하며 모든 과목을 원하는 학기로 옮길 수 있습니다. 카드를 놓으면 가장 가까운 학기의 열에만 가로로 맞추고 계획 학기 및 해당 학기 학점도 갱신합니다. 세로 위치는 놓은 좌표 그대로 유지하며 다른 카드 때문에 아래로 밀지 않습니다. 학기별 정렬과 모듈 추가에서도 기존 카드의 세로 위치를 유지합니다. 이동 시 알림은 표시하지 않습니다. 과목 카드의 쓰레기통 아이콘으로 계획에서 제거할 수 있습니다. 연결점은 기본 작은 원으로 표시하며, 오른쪽 점과 다음 과목의 왼쪽 점을 차례로 눌러 연결하거나 드래그할 수 있습니다. 기존 저장 계획은 과목·학기·상태를 유지한 채 카드 간격을 확장해 불러옵니다.

계획은 저장 버튼으로 계정/교육과정별 브라우저 로컬 저장소에 보관합니다. 서버 저장·계정 간 자동 이전·다른 기기 동기화는 하지 않습니다. 비로그인은 guest 공간을 사용합니다. 대화·첨부·LearningX 토큰은 포함하지 않습니다. 저장하지 않은 변경은 메뉴 간 이동에서 유지하며 사이트 이탈 시 브라우저 경고를 표시합니다.
