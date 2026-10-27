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
- 학습 목표 편집, 브라우저 로컬 저장
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

1. Free 프로젝트를 준비하고 `supabase/schema.sql`을 SQL Editor에서 한 번 실행합니다.
2. Auth 설정에서 Anonymous Sign-ins를 활성화합니다. 공개 운영 전 익명 가입 남용을 방지할 CAPTCHA/접근 제어를 추가하는 것이 필요합니다.
3. 공개 URL과 anon/publishable key를 `.env.example`에 안내된 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 빌드 변수로 설정합니다.
4. 학습 설정 화면에서 수동 저장/불러오기를 사용합니다. 첫 저장 또는 실제 AI 질문 시 익명 계정을 생성합니다. 각 사용자는 RLS를 통해 본인 기록만 접근합니다.
5. 익명 계정은 같은 브라우저에서만 이어집니다. 브라우저 데이터를 지우면 복구가 어려우므로 정식 로그인/계정 복구는 추후 구현해야 합니다. 클라우드 불러오기는 현재 로컬 기록을 덮어씁니다.

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

`npm run dev`는 UI와 데모 검사용이며 Pages Functions는 실행하지 않습니다. 전체 로컬 연동 검증은 Cloudflare Pages 로컬 개발 환경에서 실행해야 합니다. 모의 API 응답으로 인증 헤더, 파일 전달, 답변 처리, 한도 오류 중단을 검증했습니다. 실제 키가 없어 학교 Gateway 및 Supabase의 실호출은 아직 검증하지 않았습니다.

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
- 파일 원본은 브라우저 메모리에만 임시 유지하고 Supabase/로컬 저장에는 파일명, 형식, 크기만 기록합니다. 새로고침 후에는 재첨부해야 합니다. 전송한 자료에는 학교 Gateway와 모델 제공업체의 데이터 처리 정책이 적용됩니다.
- PDF 페이지 수, 암호화, 손상 여부는 별도로 파싱하지 않습니다. 읽을 수 없는 문서는 AI 요청 시 오류가 발생할 수 있습니다.

Google 문서: https://ai.google.dev/gemini-api/docs/document-processing
