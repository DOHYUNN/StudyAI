"""Build the verified mechanical catalog from the user-provided 2026 PDF.
Usage: python build-mechanical-catalog.py /path/to/2026-curriculum.pdf
Requires pdfplumber. The source PDF is not redistributed.
"""
import sys,re,json,hashlib
from pathlib import Path
import pdfplumber
source=Path(sys.argv[1]);courses={}
def clean(s):return (s or '').replace('\x00',' ').replace('\n','').strip()
with pdfplumber.open(source) as doc:
 for page_no in [11,12,13]:
  for table_index,table in enumerate(doc.pages[page_no-1].extract_tables()):
   owner='mechanical' if page_no==11 or page_no==12 and table_index==0 else 'robotics' if page_no==12 else 'aerospace'
   for row in table[2:]:
    if len(row)<12 or not re.fullmatch(r'[A-Z]+\d+',clean(row[3])):continue
    code=clean(row[3]);category=clean(row[1]);name=clean(row[2]);terms=[i for i,col in [(1,10),(2,11)] if '◯' in (row[col] or '')];years=[int(v) for v in re.findall(r'\d',row[9] or '')]
    item={'id':code,'code':code,'name':name,'credits':int(row[4]),'category':category,'recommendedSemester':(min(years)-1)*2+terms[0] if years and terms else None,'recommendedYears':years,'offeredSemesters':terms,'sourcePage':page_no,'aliases':[],'note':f'별표1 교육과정 편성표, PDF {page_no}쪽. 편성 학년: {clean(row[9])}학년. 개설학기: '+', '.join(str(t)+'학기' for t in terms)+'. 실제 개설 여부는 학기별 시간표를 확인하세요.'}
    if code in courses:continue
    if owner!='mechanical' and category=='전공선택':
     item['category']='전공선택';item['note']+=' 기계공학부 내 다른 전공의 전공선택 과목으로, 기계공학전공 전공선택 인정 대상입니다(PDF 12~13쪽).'
    elif owner=='aerospace' and code=='MEC370':
     item['category']='졸업논문 선수 택1';item['note']+=' 항공우주모빌리티전공의 전공필수 과목입니다. 기계공학전공 전공필수의 자동 대체로 처리하지 않습니다. 졸업논문 선수조건에서 MEC306 또는 MEC370으로 명시되어 포함했습니다(PDF 15쪽).'
    courses[code]=item
 # Follow the explicitly grouped alternatives in the prerequisite table, not the chart arrows.
 groups=[];number=0
 for page_no in [14,15]:
  last_target=None
  for row in doc.pages[page_no-1].extract_tables()[0][2:]:
   options=re.findall(r'[A-Z]+\d+',row[3] or '')
   if not options:continue
   target=clean(row[6]) or last_target
   if not target:raise ValueError('Missing prerequisite target')
   last_target=target;number+=1
   groups.append({'id':f'prereq-{number}','target':target,'options':options,'sourcePage':page_no})
 # Official digital open badge groups (appendix 7).
 tracks=[]
 for page_no in [36,37,38,39]:
  t=(doc.pages[page_no-1].extract_text() or '').replace('\x00',' ')
  matches=list(re.finditer(r'(\d+)\.\s*([^\n]+?)\s*모듈화 과목\s*\[배지명:\s*([^\]]+)\]',t))
  for j,m in enumerate(matches):
   block=t[m.end():matches[j+1].start() if j+1<len(matches) else len(t)]
   codes=list(dict.fromkeys(re.findall(r'\bMEC\d+\b',block)))
   tracks.append({'id':f'module-{m[1]}','name':m[2].strip(),'badgeName':m[3].strip(),'courseIds':codes,'sourcePage':page_no,'note':f'별표7 공식 디지털오픈배지 모듈, PDF {page_no}쪽. 모듈 내 지정 과목을 모두 이수한 뒤 학교의 신청·수여 절차를 거쳐야 합니다.'})
# Source-spelling differences are searchable, never treated as credit equivalence.
courses['MEC100']['aliases']=['수강계획서']
courses['MEC373']['aliases']=['수직이착륙공기역학']
courses['APCH1131']['aliases']=['일반 화학']
courses['APHY1000']['aliases']=['물리학 1']
for code in ['MEC102','MEC202','MEC203']:courses[code]['aliases']=[courses[code]['name'].replace('수학','수학 ')]
notes={
'MEC105':'별표5 구성표(PDF 29쪽)에는 2학년으로도 표기되지만 이 화면은 별표1의 1학년·2학기를 우선 표시합니다.',
'MEC104':'별표5 구성표(PDF 29쪽)에는 2학년으로도 표기되지만 이 화면은 별표1의 1학년·1학기를 우선 표시합니다.'}
for code,note in notes.items():courses[code]['note']+=' '+note
relations=[{'source':s,'target':g['target'],'kind':'required','groupId':g['id'],'anyOf':len(g['options'])>1,'sourcePage':g['sourcePage']} for g in groups for s in g['options']]
assert len(courses)==67,len(courses)
assert len(groups)==40,len(groups)
assert len(tracks)==14,len(tracks)
assert all(r['source'] in courses and r['target'] in courses for r in relations)
assert all(c in courses for t in tracks for c in t['courseIds'])
result={'id':'khu-mechanical-2026-v1','university':'경희대학교','department':'기계공학부 · 기계공학전공','curriculumYear':2026,'sourceTitle':'2026 공과대학 교육과정 · 사용자 제공 PDF','sourceUrl':'','verified':True,'sourceFileName':source.name,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourcePages':[6,8,9,11,12,13,14,15,29,32,36,37,38,39],
'policyNotes':['2026년 3월 1일 시행 교육과정입니다. 이전 입학자는 경과조치 적용 여부를 별도로 확인해야 합니다.','과목의 권장 학년·개설학기는 별표1 편성표를 우선 사용합니다. 이수체계도와 일부 차이가 있어 해당 과목 상세에 표시했습니다.','이름·내용이 비슷한 과목의 대체 이수를 자동으로 인정하지 않습니다. 본 기계공학부 자료에서 일반화학 APCH1131을 화학1·2로 대체하는 규정은 확인되지 않았습니다.','편성 및 학부 내 전공선택 인정 과목 66개와 졸업논문 선수 택일 실험 MEC370 1개를 포함합니다. MEC370을 기계공학전공 전공필수의 자동 대체로 인정하지 않습니다.','지능로봇공학전공의 타전공 인정 과목표(PDF 16쪽)는 기계공학전공에 일괄 적용하지 않습니다.','관심 분야는 별표7의 디지털오픈배지 모듈입니다. 전공 인증·졸업 판정을 대신하지 않습니다.'],
'requirements':{'singleMajor':{'total':79,'basic':18,'required':9,'elective':52},'graduationCredits':130,'englishCourses':3,'softwareCredits':6,'note':'교양·영어강의·SW·논문 등 별도 조건이 있으며 이 화면은 졸업 판정기가 아닙니다. 지능로봇공학전공은 관련 3모듈 중 2개, 항공우주모빌리티전공 단일전공은 관련 4모듈 중 3개 등 추가 인증 조건이 있습니다.'},'courses':list(courses.values()),'tracks':tracks,'prerequisiteGroups':groups,'relations':relations}
Path('src/roadmap/catalog.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'courses':len(courses),'prerequisiteGroups':len(groups),'prerequisiteEdges':len(relations),'modules':len(tracks),'codes':list(courses)},ensure_ascii=False))
