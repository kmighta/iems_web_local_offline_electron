# 개발용 Dockerfile (npm start 사용)

# 베이스 이미지 설정 : 베이스 이미지로 Node.js 20.19.2 사용(공식 이미지).
FROM node:20.19.2

# 작업 디렉토리 설정 : 이후 COPY, RUN, CMD 등은 기본적으로 이 디렉터리 기준으로 실행
WORKDIR /app

# 패키지 설치 : 패키지 설치 명령어 실행
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
ARG NODE_ENV=production
RUN npm run build:${NODE_ENV}


# Vite 개발 서버는 7942 포트를 사용 : 컨테이너 실행 때는 -p 호스트:컨테이너로 매핑해야 외부접속 가능.
# EXPOSE는 문서용 메타데이터일 뿐, 실제 포트를 열진 않음음
EXPOSE 5868

# 이제 start 스크립트를 실행 : 컨테이너 시작 시 실행할 기본 명령. - package.json의 "start" 스크립트를 실행합니다(예: vite --host 0.0.0.0 --port 7942 등).
CMD ["npm", "start"]
