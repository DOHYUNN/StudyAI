export const subjects = [
 {id:'physics',name:'일반 물리',category:'물리학',symbol:'F',color:'mint',description:'힘과 운동을 일상의 현상과 연결해요.',steps:['단위와 벡터, 운동의 기본 개념 이해하기','뉴턴의 운동 법칙으로 힘 분석하기','일과 에너지, 운동량 보존 적용하기','전기장과 회로의 기초 익히기'],queries:['일반물리학 벡터 운동학 기초 강의','뉴턴 운동 법칙 일 에너지 강의','일반물리학 전기장 회로 기초'],lesson:'힘과 운동의 관계'},
 {id:'chemistry',name:'일반 화학',category:'화학',symbol:'H₂',color:'peach',description:'원자부터 반응까지, 원리를 알아봐요.',steps:['원자 구조와 주기율표 이해하기','화학 결합과 분자 구조 연결하기','몰과 화학 반응식으로 양 계산하기','화학 평형과 산·염기의 기초 익히기'],queries:['일반화학 원자 구조 주기율표 기초','몰 화학 반응식 양적 관계 강의','일반화학 화학 평형 산 염기'],lesson:'몰과 화학 반응식'},
 {id:'biology',name:'일반 생물',category:'생물학',symbol:'DNA',color:'lavender',description:'세포에서 생태계까지, 생명을 이해해요.',steps:['세포 구조와 생체 분자의 역할 이해하기','세포 호흡과 광합성의 흐름 비교하기','세포 분열과 유전의 원리 익히기','진화와 생태계의 상호작용 살펴보기'],queries:['일반생물학 세포 구조 기초 강의','세포 호흡 광합성 비교 강의','일반생물학 유전 진화 기초'],lesson:'세포의 구조와 기능'},
 {id:'calculus',name:'미분적분학',category:'수학',symbol:'∫',color:'blue',description:'변화와 누적의 의미를 함께 찾아요.',steps:['함수의 극한과 연속 이해하기','미분의 의미와 도함수 계산 익히기','적분과 미적분학의 기본 정리 연결하기','급수와 다변수 미적분의 기초 살펴보기'],queries:['미분적분학 극한 연속 기초 강의','미분 도함수 적분 기본 정리','미분적분학 급수 편미분 기초'],lesson:'극한과 미분의 의미'},
 {id:'math',name:'선형대수',category:'수학',symbol:'∑',color:'peach',description:'벡터와 행렬을 그림으로 이해해요.',steps:['벡터와 선형결합을 그림으로 이해하기','행렬 연산과 선형변환 연결하기','연립방정식과 가우스 소거법 연습하기','고유값과 고유벡터의 의미 설명하기'],queries:['선형대수 벡터 선형결합 시각화','행렬 선형변환 기초 강의','고유값 고유벡터 직관'],lesson:'벡터와 선형결합'},
 {id:'engineering',name:'공학수학',category:'공학 기초',symbol:'∂',color:'mint',description:'수학 도구로 공학 문제를 풀어봐요.',steps:['일계 미분방정식의 해법 익히기','이계 선형 미분방정식과 응용 이해하기','라플라스 변환으로 방정식 풀어보기','푸리에 급수와 편미분방정식 살펴보기'],queries:['공학수학 일계 이계 미분방정식 기초','공학수학 라플라스 변환 강의','푸리에 급수 편미분방정식 기초'],lesson:'미분방정식의 기본 개념'}
];
export const youtubeUrl = q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
export const resources = subjects.flatMap(s=>s.queries.map((q,i)=>({id:`${s.id}-${i}`,subject:s.id,title:q,tag:i===0?'개념 입문':i===1?'이해 넓히기':'심화 학습',color:s.color,symbol:s.symbol,url:youtubeUrl(q)})));
export function demoReply(subject, message, confirmed) {
 if (!confirmed) return `${subject.name} 질문: “${message.slice(0,100)}”\n\n현재 이해도를 선택하면 ${subject.lesson}을 포함한 예시 학습 순서를 확인할 수 있습니다.\n\n이 응답은 연결 전 체험을 위한 예시이며, 실제 질문 분석은 AI 연결 후 제공됩니다.`;
 return `${subject.name}의 ${confirmed} 단계를 선택하셨네요. 지금은 “${subject.steps[0]}”부터 시작하는 예시 계획을 제안해요.\n\n① 핵심 개념을 읽고 자신의 말로 설명해 보세요.\n② 작은 예제 하나를 직접 풀어 보세요.\n③ 막힌 부분을 적고 관련 강의를 찾아보세요.\n\n상단의 로드맵 메뉴에서 순서를 확인할 수 있습니다.\n\n체험용 예시 응답입니다. 자유로운 질문에 대한 실제 답변은 ChatKHU 연결 후 받을 수 있어요.`;
}
