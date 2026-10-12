export const subjects = [
 {id:'cs',name:'자료구조',category:'컴퓨터공학',symbol:'{ }',color:'mint',description:'복잡한 개념도, 하나씩 연결해 보세요.',steps:['배열과 연결 리스트의 차이 이해하기','스택과 큐의 동작 직접 그려보기','트리와 그래프의 기본 구조 익히기','탐색 알고리즘을 작은 예제로 구현하기'],queries:['자료구조 배열 연결리스트 기초','스택 큐 시각화 강의','이진트리 순회 알고리즘'],lesson:'배열과 연결 리스트'},
 {id:'math',name:'선형대수학',category:'수학',symbol:'∑',color:'peach',description:'공식 너머의 의미를 함께 찾아봐요.',steps:['벡터와 선형결합을 그림으로 이해하기','행렬 연산과 선형변환 연결하기','연립방정식과 가우스 소거법 연습하기','고유값과 고유벡터의 의미 설명하기'],queries:['선형대수 벡터 선형결합 시각화','행렬 선형변환 기초 강의','고유값 고유벡터 직관'],lesson:'벡터와 선형결합'},
 {id:'biz',name:'경영학원론',category:'경영학',symbol:'↗',color:'lavender',description:'이론을 일상의 사례와 연결해 보세요.',steps:['경영의 네 가지 기능 정리하기','기업 사례로 SWOT 분석해 보기','마케팅 STP 전략 구분하기','실제 기업의 전략을 한 장으로 정리하기'],queries:['경영학원론 기초 강의','SWOT 분석 기업 사례','마케팅 STP 전략 강의'],lesson:'경영의 기본 개념'},
 {id:'psych',name:'심리학개론',category:'심리학',symbol:'◎',color:'blue',description:'사람을 이해하는 첫걸음을 시작해요.',steps:['심리학의 주요 관점 비교하기','고전적 조건형성과 조작적 조건형성 구분하기','기억의 과정과 인출 연습 이해하기','일상 사례를 심리학 개념으로 설명하기'],queries:['심리학개론 기초 강의','고전적 조작적 조건형성 비교','인지심리학 기억 학습'],lesson:'심리학의 주요 관점'}
];
export const youtubeUrl = q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
export const resources = subjects.flatMap(s=>s.queries.map((q,i)=>({id:`${s.id}-${i}`,subject:s.id,title:q,tag:i===0?'개념 입문':i===1?'이해 넓히기':'한 걸음 더',color:s.color,symbol:s.symbol,url:youtubeUrl(q)})));
export function demoReply(subject, message, confirmed) {
 if (!confirmed) return `${subject.name}을 함께 공부해 봐요. “${message.slice(0,100)}”라는 고민을 확인했어요.\n\n먼저 ${subject.lesson}부터 살펴보는 건 어떨까요? 지금 단계에서는 학습 수준을 단정할 수 없어요. 아래에서 현재 이해도에 가까운 항목을 골라주세요.\n\n이 응답은 연결 전 체험을 위한 예시이며, 실제 질문 분석은 AI 연결 후 제공됩니다.`;
 return `${subject.name}의 ${confirmed} 단계를 선택하셨네요. 지금은 “${subject.steps[0]}”부터 시작하는 예시 계획을 제안해요.\n\n① 핵심 개념을 읽고 자신의 말로 설명해 보세요.\n② 작은 예제 하나를 직접 풀어 보세요.\n③ 막힌 부분을 적고 관련 강의를 찾아보세요.\n\n옆의 로드맵에서 순서를 확인할 수 있어요. 속도보다 오늘 이해한 한 가지가 더 중요해요.\n\n체험용 예시 응답입니다. 자유로운 질문에 대한 실제 답변은 Gemini 연결 후 받을 수 있어요.`;
}
