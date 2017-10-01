# Job Queue test
큐 호스팅 만들기 전에 이것저것 테스트합니다.

#### 시작하기
`npm start`

#### 문서 빌드
`grunt nodocs`

----------------------------

### kue.js 테스트
- global events(enqueue)가 잘되어있어서 커스텀 하기 좋음
- .delay() 이런식 API도 좋음
- locked job이 상태가 변한다거나 이슈가 있는듯?
- schedule 기능이 없고, unique id 지원안해서그냥 쓰기엔 부족함.
- 기본기능은 의외로 잘만들어짐.

### OptimalBits/bull 테스트
- global events(enqueue)가 거의없어서 커스텀 어려움
- 세세한 옵션이 있어서 개발할땐 쓰기 좋을듯
- lock 부분 잘됨
- schedule 기능이 있고, unique id 지원도 하지만
- scheduled job에 대해 id 검색이 안되는등 무언가 빠져있음
- processor 설정하면 아예 child_process fork로 가능 !!!
- SQS VisibilityTimeout은 backoff delay로 일단 해결?

### bull + grpc.io 테스트
- 상세한 client API는 고민 더 필요함. Proof of Concept으로 한다.
- 당연히 pub/sub은 잘됨
- 클라이언트 코드가 간결함
- Visibility 처리가 문제임 ...
  > MessageReceipt ID로 EventEmitter callback하여서
  > 해당 job process done(null, 정상처리) 끝내는게 좋을듯.
  > 단 VisibilityTimeout만큼 timeout이 필요함 + 해당 ReceiptID invalidate.

